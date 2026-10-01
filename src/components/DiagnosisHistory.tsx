import { Clock3, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./SeverityBadge";
import type { Diagnosis } from "@/lib/diagnose.functions";

export type HistoryEntry = {
  id: string;
  createdAt: string;
  mode: "demo" | "backend";
  log: string;
  diagnosis: Diagnosis;
};

export function DiagnosisHistory({
  entries,
  onRestore,
  onClear,
}: {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="history-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="history-title" className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="size-4" /> Recent diagnoses
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Saved only in this browser.</p>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-2" onClick={onClear}>
            <Trash2 className="size-4" /> Clear
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Completed diagnoses will appear here.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={entry.diagnosis.severity} />
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      {entry.mode}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug">
                    {entry.diagnosis.root_cause}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reopen diagnosis"
                  title="Reopen diagnosis"
                  onClick={() => onRestore(entry)}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}