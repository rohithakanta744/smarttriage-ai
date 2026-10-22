import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { GitCompareArrows, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { SeverityBadge } from './SeverityBadge';
import { diagnoseLog } from '@/lib/diagnose.functions';
import { diagnoseInDemo } from '@/lib/demo-diagnoses';
import { maskSensitive } from '@/lib/log-processing';
import { maskDiagnosis, type Diagnosis } from '@/lib/diagnosis';

export function EngineComparison({ log }: { log: string }) {
  const run = useServerFn(diagnoseLog);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ input: string; demo: Diagnosis; hosted: Diagnosis | null; error: string | null } | null>(null);
  async function compare() {
    const input = maskSensitive(log).text;
    if (!input.trim() || busy) return;
    setBusy(true);
    setResults({ input, demo: maskDiagnosis(diagnoseInDemo(input)), hosted: null, error: null });
    try {
      const response = await run({ data: { errorLog: input } });
      setResults({ input, demo: maskDiagnosis(diagnoseInDemo(input)), hosted: response.ok ? maskDiagnosis(response.diagnosis) : null, error: response.ok ? null : response.error });
    } catch (error) {
      setResults(current => current ? { ...current, error: error instanceof Error ? error.message : 'Hosted comparison could not complete.' } : null);
    } finally { setBusy(false); }
  }
  return <section aria-label="Engine comparison" className="mt-6 border-t border-border py-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">Same log · two engines</h2><Button variant="outline" disabled={busy || !log.trim()} onClick={() => void compare()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <GitCompareArrows className="size-4" />}{busy ? 'Comparing…' : 'Compare Demo & Hosted AI'}</Button></div>
    <p className="mt-2 text-xs text-muted-foreground">One live Hosted AI request uses workspace AI credits. Both engines receive the same masked prepared log.</p>
    {results && <><p className="my-3 text-xs text-muted-foreground">Both engines received the identical masked input ({results.input.length.toLocaleString()} characters). Hosted AI uses workspace AI credits. Comparison results are not automatically saved.</p><details className="mb-4 text-xs"><summary className="cursor-pointer">Comparison input</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono">{results.input}</pre></details><div className="grid gap-4 md:grid-cols-2">{(['demo', 'hosted'] as const).map(engine => {
      const diagnosis = results[engine];
      return <article key={engine} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{engine === 'demo' ? 'Demo · fixed rules' : 'Hosted AI · live reasoning'}</h3>{diagnosis && <SeverityBadge severity={diagnosis.severity} />}</div><p className="mt-2 text-xs text-muted-foreground">{engine === 'demo' ? 'Local pattern matching. No model inference; unfamiliar incidents may receive a generic answer.' : 'A real model evaluates this input. Hypotheses can differ; correctness still needs engineer review.'}</p>{diagnosis ? <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-medium">Root cause hypothesis</dt><dd className="mt-1 whitespace-pre-wrap">{diagnosis.root_cause}</dd></div><div><dt className="font-medium">Recommended action</dt><dd className="mt-1 whitespace-pre-wrap">{diagnosis.recommended_action}</dd></div>{diagnosis.evidence_lines?.length ? <div><dt className="font-medium">Evidence lines</dt><dd>{diagnosis.evidence_lines.join(', ')}</dd></div> : null}</dl> : <p role="status" className="mt-4 text-sm text-muted-foreground">{busy ? 'Analyzing the same log…' : results.error}</p>}</article>;
    })}</div></>}
  </section>;
}