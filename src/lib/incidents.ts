import type { UIMessage } from 'ai';
import { maskSensitive } from './log-processing';
import { diagnosisSchema, type Diagnosis } from './diagnosis';

export type Incident = { id: string; title: string; log: string; diagnosis: Diagnosis; status: 'open' | 'resolved'; messages: UIMessage[] };
const KEY = 'smarttriage.incidents';
export function splitIncidents(text: string): { log: string; firstLine: number; title: string }[] {
  const lines = text.slice(0, 50000).split('\n');
  const starts: number[] = [];
  lines.forEach((line, i) => {
    if (/\b(ERROR|CRITICAL|FATAL)\b|^Traceback \(|^panic:|^Exception in thread/i.test(line) && !/^\s+/.test(line)) starts.push(i);
  });
  if (!starts.length) return text.trim() ? [{ log: text.slice(0,50000), firstLine: 1, title: lines[0]?.slice(0,100) ?? 'Incident' }] : [];
  const groups = new Map<string, { log: string; firstLine: number; title: string }>();
  starts.forEach((start, i) => {
    const end = starts[i + 1] ?? lines.length;
    const title = lines[start] ?? 'Incident';
    const signature = title.replace(/^.*?\b(ERROR|CRITICAL|FATAL)\b\s*[:\-]?/i, '').replace(/\b\d+\b/g, '#').trim().toLowerCase();
    const chunk = lines.slice(start, end).join('\n');
    const existing = groups.get(signature);
    if (existing) existing.log += '\n' + chunk;
    else groups.set(signature, { log: chunk, firstLine: start + 1, title: title.slice(0,100) });
  });
  return [...groups.values()];
}
export function readIncidents(): Incident[] {
  try { const values: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(values)) return [];
    return values.filter(v => v && typeof v.id === 'string' && typeof v.log === 'string' && diagnosisSchema.safeParse(v.diagnosis).success && Array.isArray(v.messages) && ['open','resolved'].includes(v.status)).slice(0,50);
  } catch { return []; }
}
export function saveIncident(incident: Incident) {
  const safe = { ...incident, log: maskSensitive(incident.log).text, messages: incident.messages.map(message => ({ ...message, parts: message.parts.filter(p => p.type === 'text' || p.type === 'reasoning').map(part => ({ ...part, text: 'text' in part ? maskSensitive(part.text).text : '' })) })) };
  localStorage.setItem(KEY, JSON.stringify([safe, ...readIncidents().filter(v => v.id !== safe.id)].slice(0,50)));
}
export function deleteIncident(id: string) { localStorage.setItem(KEY, JSON.stringify(readIncidents().filter(v => v.id !== id))); }