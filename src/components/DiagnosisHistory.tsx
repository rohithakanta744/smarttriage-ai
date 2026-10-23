import { Clock3, RotateCcw, Trash2 } from "lucide-react";
import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./SeverityBadge";
import type { Diagnosis } from "@/lib/diagnose.functions";

export type HistoryEntry = {
  id: string;
  createdAt: string;
  mode: "demo" | "backend" | "cloud";
  tags?: string[];
  log: string;
  diagnosis: Diagnosis;
};

export function DiagnosisHistory({
  entries,
  onRestore,
  onClear,
  onDelete,
  scope = 'device',
}: {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onClear: () => void;
  onDelete?: (id: string) => void;
  scope?: 'device'|'team';
}) {
  const [search, setSearch] = useState('');
  const filtered = entries.filter(entry => `${entry.diagnosis.root_cause} ${entry.diagnosis.severity} ${entry.tags?.join(' ') ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="mt-8 border-t border-border pt-6" aria-labelledby="history-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="history-title" className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="size-4" /> {scope === 'team' ? 'Team diagnoses' : 'Recent diagnoses'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{scope === 'team' ? 'Shared with workspace members.' : 'Saved only in this browser.'}</p>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-2" onClick={onClear}>
            <Trash2 className="size-4" /> {scope === 'team' ? 'Clear my reports' : 'Clear'}
          </Button>
        )}
      </div>

      <Input className="mb-3 max-w-sm" placeholder="Search cause, severity or tags" aria-label="Search diagnosis history" value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Completed diagnoses will appear here.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => (
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
                  {!!entry.tags?.length && <p className="mt-2 text-xs text-muted-foreground">{entry.tags.join(' · ')}</p>}
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
                {onDelete && <Button variant="ghost" size="icon" aria-label="Delete diagnosis" title="Delete diagnosis" onClick={() => { if (window.confirm('Delete this diagnosis?')) onDelete(entry.id); }}><Trash2 className="size-4" /></Button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}