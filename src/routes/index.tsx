import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import type { DiagnosisMode } from "@/components/Navbar";
import { LogInput } from "@/components/LogInput";
import { ResultPanel } from "@/components/ResultPanel";
import { DiagnosisHistory, type HistoryEntry } from "@/components/DiagnosisHistory";
import { diagnoseLog, type Diagnosis } from "@/lib/diagnose.functions";
import { diagnoseInDemo, SAMPLE_INCIDENTS } from "@/lib/demo-diagnoses";

const TITLE = "SmartTriage AI — instant diagnostics for production error logs";
const DESCRIPTION =
  "Paste a raw production error log or JSON alert and get a structured diagnosis: severity, root cause and recommended action.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STAGES = ["Scanning vector DB...", "Retrieving similar incidents...", "Analyzing via LLM..."];
const STORAGE_KEY = "smarttriage.apiBaseUrl";
const MODE_KEY = "smarttriage.mode";
const HISTORY_KEY = "smarttriage.history";
const DEFAULT_API_BASE_URL = "http://localhost:8000";
const MAX_HISTORY = 12;

function Index() {
  const [log, setLog] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [mode, setMode] = useState<DiagnosisMode>("demo");
  const [selectedSample, setSelectedSample] = useState("gateway-timeout");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stage, setStage] = useState(STAGES[0]!);
  const [result, setResult] = useState<{ diagnosis: Diagnosis } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setApiBaseUrl(localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE_URL);
    const storedMode = localStorage.getItem(MODE_KEY);
    if (storedMode === "demo" || storedMode === "backend") setMode(storedMode);
    try {
      const storedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
      if (Array.isArray(storedHistory)) setHistory(storedHistory.slice(0, MAX_HISTORY));
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const run = useServerFn(diagnoseLog);

  const mutation = useMutation({
    mutationFn: async (errorLog: string) => {
      if (mode === "demo") {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return { ok: true as const, diagnosis: diagnoseInDemo(errorLog) };
      }
      return run({ data: { errorLog, apiBaseUrl } });
    },
    onMutate: () => {
      setResult(null);
      setError(null);
      let i = 0;
      setStage(STAGES[0]!);
      timer.current = setInterval(() => {
        i = (i + 1) % STAGES.length;
        setStage(STAGES[i]!);
      }, 1200);
    },
    onSettled: () => {
      if (timer.current) clearInterval(timer.current);
    },
    onSuccess: (res) => {
      if (res.ok) {
        setResult({ diagnosis: res.diagnosis });
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          mode,
          log,
          diagnosis: res.diagnosis,
        };
        setHistory((current) => {
          const next = [entry, ...current].slice(0, MAX_HISTORY);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
        });
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    },
    onError: () => {
      const msg =
        "Backend unreachable. Make sure the Python FastAPI server is running on port 8000.";
      setError(msg);
      toast.error(msg);
    },
  });

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const saveApiBaseUrl = (next: string) => {
    setApiBaseUrl(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const changeMode = (next: DiagnosisMode) => {
    setMode(next);
    setResult(null);
    setError(null);
    localStorage.setItem(MODE_KEY, next);
  };

  const loadSample = () => {
    const currentIndex = SAMPLE_INCIDENTS.findIndex((sample) => sample.id === selectedSample);
    const sample = SAMPLE_INCIDENTS[currentIndex >= 0 ? currentIndex : 0];
    if (!sample) return;
    setLog(sample.log);
    setResult(null);
    setError(null);
    const next = SAMPLE_INCIDENTS[(currentIndex + 1) % SAMPLE_INCIDENTS.length];
    if (next) setSelectedSample(next.id);
  };

  const restoreHistory = (entry: HistoryEntry) => {
    setLog(entry.log);
    setResult({ diagnosis: entry.diagnosis });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success("Diagnosis history cleared.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        apiBaseUrl={apiBaseUrl}
        onSaveApiBaseUrl={saveApiBaseUrl}
        mode={mode}
        onModeChange={changeMode}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight">Log triage console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "demo"
              ? "Try sample incidents or paste a log. Demo mode works without a backend."
              : "Connected mode sends the log to your configured diagnosis service."}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <LogInput
            value={log}
            onChange={setLog}
            onSubmit={() => mutation.mutate(log)}
            isPending={mutation.isPending}
            stage={stage}
            selectedSample={selectedSample}
            onSelectedSampleChange={setSelectedSample}
            onLoadSample={loadSample}
          />
          <ResultPanel
            diagnosis={result?.diagnosis ?? null}
            error={error}
            isPending={mutation.isPending}
            stage={stage}
            log={log}
          />
        </div>
        <DiagnosisHistory entries={history} onRestore={restoreHistory} onClear={clearHistory} />
      </main>
    </div>
  );
}
