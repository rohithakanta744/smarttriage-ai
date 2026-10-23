import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ScanLine, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { SeverityBadge } from './SeverityBadge';
import { splitIncidents, saveIncident, type Incident } from '@/lib/incidents';
import { diagnoseLog } from '@/lib/diagnose.functions';
import { diagnoseInDemo } from '@/lib/demo-diagnoses';
import { runExternal } from '@/lib/external-backend';
import { maskSensitive } from '@/lib/log-processing';
import { maskDiagnosis } from '@/lib/diagnosis';

export function MultiIncident({ log, mode, base, provider }: { log: string; mode: 'demo'|'cloud'|'backend'; base: string; provider: string }) {
  const [scanned, setScanned] = useState<ReturnType<typeof splitIncidents>>([]);
  const [results, setResults] = useState<Incident[]>([]); const [busy, setBusy] = useState(false); const run = useServerFn(diagnoseLog);
  async function analyze() {
    setBusy(true); setResults([]);
    try { for (const item of scanned) {
      const input = maskSensitive(item.log).text;
      const res = mode === 'demo' ? { ok: true as const, diagnosis: diagnoseInDemo(input) } : mode === 'cloud' ? await run({ data: { errorLog: input } }) : await runExternal(input, base, provider);
      if (!res.ok) { toast.error(res.error); break; }
      const incident: Incident = { id: crypto.randomUUID(), title: maskSensitive(item.title).text, log: input, diagnosis: maskDiagnosis(res.diagnosis), status: 'open', messages: [] };
      saveIncident(incident); setResults(current => [...current, incident]);
    } } catch (e) { toast.error(e instanceof Error ? e.message : 'Incident triage failed.'); } finally { setBusy(false); }
  }
  return <section className="mt-6 border-t border-border pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Multi-error triage</h2><Button variant="outline" size="sm" disabled={busy || !log.trim()} onClick={() => { setScanned(splitIncidents(log)); setResults([]); }}><ScanLine className="size-4" />Scan errors</Button></div>{scanned.length > 0 && <><ol className="my-3 space-y-2 text-sm">{scanned.map((item,i) => <li key={i} className="break-words"><span className="font-mono text-xs text-muted-foreground">{i+1} / line {item.firstLine} </span>{item.title}</li>)}</ol><Button disabled={busy} onClick={() => void analyze()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}Triage {scanned.length} error groups</Button>{mode !== 'demo' && <p className="mt-2 text-xs text-muted-foreground">One live AI request per group; stops on the first failure.</p>}</>}{results.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{results.map(incident => <article key={incident.id} className="rounded-md border border-border p-4"><SeverityBadge severity={incident.diagnosis.severity} /><p className="my-3 text-sm">{incident.diagnosis.root_cause}</p><Button asChild variant="outline" size="sm"><Link to="/incidents/$incidentId" params={{ incidentId: incident.id }}><MessageSquare className="size-4" />Investigate</Link></Button></article>)}</div>}</section>;
}