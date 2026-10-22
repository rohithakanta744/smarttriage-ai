import Papa from 'papaparse';

export const MAX_LOG_CHARS = 50000;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const ERROR_PATTERN = /error|fatal|exception|panic|traceback|oomkilled/i;

export function maskSensitive(text: string) {
  const counts: Record<string, number> = {};
  const replace = (kind: string) => () => { counts[kind] = (counts[kind] ?? 0) + 1; return `[${kind}]`; };
  let masked = text.replace(/\bBearer\s+[^\s"',;]+/gi, replace('TOKEN'));
  masked = masked.replace(/\b(?:api[_-]?key|password|secret|(?:access|refresh|id)[_-]?token|client[_-]?secret)\b["']?\s*[:=]\s*["']?[^\s"',;}]+/gi, replace('SECRET'));
  masked = masked.replace(/\b(?:set-cookie|cookie)\s*:\s*[^\r\n]+/gi, replace('COOKIE'));
  masked = masked.replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+:[^\s/@]+@/gi, (_value, protocol: string) => { counts['SECRET'] = (counts['SECRET'] ?? 0) + 1; return `${protocol}[SECRET]@`; });
  masked = masked.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replace('EMAIL'));
  masked = masked.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (value) => value.split('.').every(x => Number(x) <= 255) ? replace('IP')() : value);
  masked = masked.replace(/(?<![\w:])(?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}(?![\w:])/gi, (value) => value.length >= 3 && value !== '::' ? replace('IP')() : value);
  masked = masked.replace(/\b(?:\d[ -]?){13,19}\b/g, (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return value;
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) { let n = Number(digits[i]); if ((digits.length - 1 - i) % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
    return sum % 10 === 0 ? replace('CARD')() : value;
  });
  return { text: masked, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

export function detectFormat(text: string) {
  const trimmed = text.trim();
  try { JSON.parse(trimmed); return 'JSON'; } catch { /* inspect other formats */ }
  if (trimmed.split('\n').filter(Boolean).every(line => { try { JSON.parse(line); return true; } catch { return false; } }) && trimmed) return 'JSON Lines';
  if (/Traceback \(most recent call last\)/.test(text)) return 'Python traceback';
  if (/\bat [\w.$]+\([^\n]*:\d+\)/.test(text)) return 'Java stack trace';
  if (/panic:|goroutine \d+/.test(text)) return 'Go panic';
  if (/"(?:GET|POST|PUT|DELETE|HEAD) [^\n]+HTTP\/[\d.]+"/.test(text)) return 'HTTP access log';
  if (/Citrix|HDX|VDA|BrokerAgent/i.test(text)) return 'Citrix VDA text';
  return 'Plain text';
}

export function extractLog(text: string, smart = true) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  if (text.length <= MAX_LOG_CHARS) return { text: lines.join('\n'), lineNumbers: lines.map((_, i) => i + 1), originalLines: lines.length, omitted: 0 };
  const selected = new Set<number>();
  // Allocate room to error context first, then head/tail; render in original order.
  if (smart) lines.forEach((line, i) => { if (ERROR_PATTERN.test(line)) for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) selected.add(j); });
  const priority = [...selected];
  for (let i = 0; i < Math.min(50, lines.length); i++) priority.push(i);
  for (let i = Math.max(0, lines.length - 200); i < lines.length; i++) priority.push(i);
  const kept = new Map<number, string>();
  let used = 0;
  for (const i of priority) {
    if (kept.has(i)) continue;
    const line = lines[i] ?? '';
    const room = MAX_LOG_CHARS - used - 1;
    if (room <= 0) break;
    const chunk = line.slice(0, room);
    kept.set(i, chunk); used += chunk.length + 1;
  }
  const indices = [...kept.keys()].sort((a,b) => a-b);
  return { text: indices.map(i => kept.get(i)).join('\n'), lineNumbers: indices.map(i => i + 1), originalLines: lines.length, omitted: lines.length - indices.length };
}

export async function readLogFile(file: File, progress: (value: number) => void) {
  if (file.size > MAX_FILE_BYTES) throw new Error('File exceeds the 20 MB limit. Export a smaller time range.');
  if (!/\.(log|txt|json|jsonl|csv|tsv|har|gz)$/i.test(file.name)) throw new Error('Unsupported file. Export ETL, EVTX, PCAP or dump files as text first.');
  progress(10);
  let stream: ReadableStream<BufferSource> = file.stream();
  if (/\.gz$/i.test(file.name)) stream = stream.pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength); size += chunk.byteLength; if (size > MAX_FILE_BYTES) { await reader.cancel(); throw new Error('Expanded file exceeds the 20 MB safety limit.'); } chunks.push(chunk); progress(Math.min(85, 10 + Math.round(size / Math.max(file.size, 1) * 60))); }
  } catch (e) { throw e instanceof Error && e.message.includes('safety limit') ? e : new Error('Could not decompress or read this file. Check that it is valid gzip/text.'); }
  const bytes = new Uint8Array(size); let offset = 0; chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.length; });
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); } catch { throw new Error('File is not UTF-8 text. Export it as UTF-8 before importing.'); }
  if (text.includes('\0')) throw new Error('Binary logs must be exported as text before importing.');
  if (!text.trim()) throw new Error('The file is empty.');
  if (/\.(csv|tsv)(\.gz)?$/i.test(file.name)) { const parsed = Papa.parse<string[]>(text, { delimiter: /\.tsv/i.test(file.name) ? '\t' : ',', skipEmptyLines: true }); text = parsed.data.map(row => row.join(' | ')).join('\n'); }
  progress(100); return text;
}