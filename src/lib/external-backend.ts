import { diagnosisSchema } from './diagnosis';
import type { DiagnoseResult } from './diagnose.functions';

export function backendUrl(base: string, path: string) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an HTTP or HTTPS service address without credentials.');
  return `${url.origin}${url.pathname.replace(/\/$/, '')}${path}`;
}
let sessionToken = '';
export function setServiceToken(token: string) { sessionToken = token; }
export async function externalRequest<T>(base: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(backendUrl(base, path), { method, headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!res.ok) { const error = await res.json().catch(() => null); throw new Error(typeof error?.detail === 'string' ? error.detail : `Service returned HTTP ${res.status}.`); }
  return res.json();
}
export async function runExternal(errorLog: string, base: string, provider = 'openai'): Promise<DiagnoseResult> {
  try {
    const parsed = diagnosisSchema.safeParse(await externalRequest(base, '/api/diagnose', 'POST', { error_log: errorLog, provider }));
    return parsed.success ? { ok: true, diagnosis: parsed.data } : { ok: false, error: 'The service did not return severity, root_cause and recommended_action.' };
  } catch (error) { return { ok: false, error: error instanceof TypeError ? 'Backend unreachable. Make sure the Python FastAPI server is running on port 8000.' : error instanceof Error ? error.message : 'Diagnosis failed.' }; }
}
export async function pingExternal(base: string) {
  const start = performance.now();
  const response = await fetch(backendUrl(base, '/health'), { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}`);
  return Math.round(performance.now() - start);
}