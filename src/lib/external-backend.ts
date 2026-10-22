import { diagnosisSchema } from './diagnosis';
import type { DiagnoseResult } from './diagnose.functions';

export function backendUrl(base: string, path: string) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an HTTP or HTTPS service address without credentials.');
  return `${url.origin}${url.pathname.replace(/\/$/, '')}${path}`;
}
export async function runExternal(errorLog: string, base: string): Promise<DiagnoseResult> {
  try {
    const res = await fetch(backendUrl(base, '/api/diagnose'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error_log: errorLog }), signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { ok: false, error: `The diagnosis service returned HTTP ${res.status}. Check its service logs.` };
    const parsed = diagnosisSchema.safeParse(await res.json());
    return parsed.success ? { ok: true, diagnosis: parsed.data } : { ok: false, error: 'The service did not return severity, root_cause and recommended_action.' };
  } catch { return { ok: false, error: 'Backend unreachable. Make sure the Python FastAPI server is running on port 8000.' }; }
}
export async function pingExternal(base: string) {
  const start = performance.now();
  const response = await fetch(backendUrl(base, '/health'), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}`);
  return Math.round(performance.now() - start);
}