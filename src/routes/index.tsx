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
import { PushConfirmation } from "@/components/PushConfirmation";
import { IngestionTools } from '@/components/IngestionTools';
import { BackendHealth } from '@/components/BackendHealth';
import { TeamWorkspace } from '@/components/TeamWorkspace';
import { EngineComparison } from '@/components/EngineComparison';
import { DeliverySetup } from '@/components/DeliverySetup';
import { Input } from '@/components/ui/input';
import { extractLog, maskSensitive } from '@/lib/log-processing';
import { runExternal } from '@/lib/external-backend';
import { diagnosisSchema, maskDiagnosis } from '@/lib/diagnosis';
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

const STAGES = ["Analyzing log...", "Reviewing evidence...", "Preparing diagnosis..."];
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
  const [smart, setSmart] = useState(true);
  const [masked, setMasked] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const extracted = extractLog(log, smart);
  const anonymized = maskSensitive(extracted.text);
  const prepared = masked ? anonymized.text : extracted.text;
  const [stage, setStage] = useState(STAGES[0] ?? 'Analyzing...');
  const [result, setResult] = useState<{ diagnosis: Diagnosis; log: string; mode: DiagnosisMode } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      setApiBaseUrl(localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE_URL);
      const storedMode = localStorage.getItem(MODE_KEY);
      if (storedMode === 'demo' || storedMode === 'backend' || storedMode === 'cloud') setMode(storedMode);
      const storedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
      if (Array.isArray(storedHistory)) {
        const safeHistory = storedHistory.filter(entry => entry && typeof entry.id === 'string' && typeof entry.log === 'string' && typeof entry.createdAt === 'string' && ['demo','backend','cloud'].includes(entry.mode) && diagnosisSchema.safeParse(entry.diagnosis).success).slice(0, MAX_HISTORY).map(entry => ({ ...entry, log: maskSensitive(entry.log.slice(0,50000)).text, diagnosis: maskDiagnosis(entry.diagnosis), tags: Array.isArray(entry.tags) ? entry.tags.filter((t: unknown) => typeof t === 'string').slice(0,8).map((t: string) => maskSensitive(t.slice(0,40)).text) : [] }));
        setHistory(safeHistory); localStorage.setItem(HISTORY_KEY, JSON.stringify(safeHistory));
      }
    } catch {
      toast.error('Browser storage is unavailable. Diagnoses can still run.');
    }
  }, []);

  const run = useServerFn(diagnoseLog);

  const mutation = useMutation({
    mutationFn: async (input: { errorLog: string; mode: DiagnosisMode; tags: string[] }) => {
      if (input.mode === "demo") {
        await new Promise((resolve) => setTimeout(resolve, 900));
        return { ok: true as const, diagnosis: diagnoseInDemo(input.errorLog) };
      }
      return input.mode === 'cloud' ? run({ data: { errorLog: maskSensitive(input.errorLog).text } }) : runExternal(input.errorLog, apiBaseUrl);
    },
    onMutate: () => {
      setResult(null);
      setError(null);
      let i = 0;
      setStage(STAGES[0] ?? 'Analyzing...');
      timer.current = setInterval(() => {
        i = (i + 1) % STAGES.length;
        setStage(STAGES[i] ?? 'Analyzing...');
      }, 1200);
    },
    onSettled: () => {
      if (timer.current) clearInterval(timer.current);
    },
    onSuccess: (res, input) => {
      if (res.ok) {
        const safeDiagnosis = maskDiagnosis(res.diagnosis);
        setResult({ diagnosis: safeDiagnosis, log: maskSensitive(input.errorLog).text, mode: input.mode });
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          mode: input.mode,
          log: maskSensitive(input.errorLog).text,
          diagnosis: safeDiagnosis,
          tags: input.tags,
        };
        setHistory((current) => {
          const next = [entry, ...current].slice(0, MAX_HISTORY);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { toast.error('Report completed, but browser history could not be saved.'); }
          return next;
        });
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    },
    onError: (_error, input) => {
      const msg = input.mode === 'backend' ? "Backend unreachable. Make sure the Python FastAPI server is running on port 8000." : 'Diagnosis could not complete. Your input is preserved.';
      setError(msg);
      toast.error(msg);
    },
  });

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const saveApiBaseUrl = (next: string) => {
    setApiBaseUrl(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* preference remains for this session */ }
  };

  const changeMode = (next: DiagnosisMode) => {
    setMode(next);
    setResult(null);
    setError(null);
    try { localStorage.setItem(MODE_KEY, next); } catch { /* preference remains for this session */ }
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
    setResult({ diagnosis: entry.diagnosis, log: entry.log, mode: entry.mode });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* cleared in memory */ }
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
        <PushConfirmation />
        <div className="mb-6">
          <h1 className="text-lg font-semibold tracking-tight">Log triage console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "demo"
               ? 'Demo · deterministic sample diagnoses'
               : mode === 'cloud' ? 'Hosted AI · evidence-based hypotheses, not confirmed remediation' : 'External FastAPI · browser connection'}
          </p>
          <div className="mt-2"><BackendHealth mode={mode} base={apiBaseUrl} /></div>
        </div>
        <IngestionTools raw={log} prepared={prepared} numbers={extracted.lineNumbers} maskedCount={anonymized.total} omitted={extracted.omitted} smart={smart} masked={masked} onSmart={setSmart} onMasked={setMasked} onImport={text => { setLog(text); setResult(null); setError(null); }} />
        <Input className="mb-4 max-w-sm" placeholder="Incident tags, comma-separated" aria-label="Incident tags" value={tagInput} maxLength={200} onChange={e => setTagInput(e.target.value)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <LogInput
            value={log}
            onChange={setLog}
            onSubmit={() => mutation.mutate({ errorLog: prepared, mode, tags: tagInput.split(',').map(t => maskSensitive(t.trim().slice(0,40)).text).filter(Boolean).slice(0,8) })}
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
            log={result?.log ?? prepared}
          />
        </div>
        <EngineComparison log={prepared} />
        <DiagnosisHistory entries={history} onRestore={restoreHistory} onClear={clearHistory} />
        <DeliverySetup />
        <details className="mt-6 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-semibold">Team accounts · upcoming / preview setup</summary><p className="mt-2 text-xs text-muted-foreground">Email confirmation stays required. This preview supports workspace setup and direct company webhooks, but delivery needs your company configuration. Device history is never uploaded automatically.</p><TeamWorkspace diagnosis={result?.diagnosis ?? null} log={maskSensitive(result?.log ?? prepared).text} mode={result?.mode ?? mode} tags={tagInput.split(',').map(t => maskSensitive(t.trim().slice(0,40)).text).filter(Boolean).slice(0,8)} onRestore={restoreHistory} /></details>
      </main>
    </div>
  );
}
