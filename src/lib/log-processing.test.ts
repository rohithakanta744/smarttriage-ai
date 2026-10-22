import { describe, expect, it } from 'vitest';
import { detectFormat, extractLog, maskSensitive, MAX_FILE_BYTES, MAX_LOG_CHARS, readLogFile } from './log-processing';

describe('log ingestion rules', () => {
  it('caps prepared logs at 50,000 characters', () => { expect(extractLog('x'.repeat(50001)).text.length).toBeLessThanOrEqual(50000); expect(MAX_LOG_CHARS).toBe(50000); });
  it('keeps first 50, last 200 and middle error context', () => { const lines = Array.from({length: 1200}, (_,i) => `${i === 600 ? 'ERROR' : 'INFO'} ${i} ${'x'.repeat(80)}`); const r = extractLog(lines.join('\n')); expect(r.lineNumbers).toContain(1); expect(r.lineNumbers).toContain(50); expect(r.lineNumbers).toContain(1001); expect(r.lineNumbers).toContain(1200); expect(r.lineNumbers).toContain(601); expect(r.lineNumbers).toContain(599); expect(r.omitted).toBeGreaterThan(0); });
  it('enforces a 20 MB file limit', async () => { expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024); await expect(readLogFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.log'), () => {})).rejects.toThrow('20 MB'); });
  it('imports supported plain text and gzip', async () => { expect(await readLogFile(new File(['ERROR timeout'], 'incident.log'), () => {})).toBe('ERROR timeout'); const stream = new Blob(['ERROR panic']).stream().pipeThrough(new CompressionStream('gzip')); const compressed = await new Response(stream).arrayBuffer(); expect(await readLogFile(new File([compressed], 'incident.log.gz'), () => {})).toBe('ERROR panic'); });
  it('rejects unsupported binary formats', async () => { await expect(readLogFile(new File(['binary'], 'incident.evtx'), () => {})).rejects.toThrow('Unsupported'); });
  it('rejects malformed gzip and empty text', async () => { await expect(readLogFile(new File(['not gzip'], 'bad.gz'), () => {})).rejects.toThrow('decompress'); await expect(readLogFile(new File([''], 'empty.log'), () => {})).rejects.toThrow('empty'); });
  it('rejects gzip that expands beyond 20 MB', async () => { const stream = new Blob(['x'.repeat(MAX_FILE_BYTES + 1)]).stream().pipeThrough(new CompressionStream('gzip')); const compressed = await new Response(stream).arrayBuffer(); await expect(readLogFile(new File([compressed], 'bomb.log.gz'), () => {})).rejects.toThrow('safety limit'); });
  it('normalizes CSV fields and rejects non-UTF8 text', async () => { expect(await readLogFile(new File(['level,message\nERROR,"timeout, retry"'], 'incident.csv'), () => {})).toBe('level | message\nERROR | timeout, retry'); await expect(readLogFile(new File([new Uint8Array([255,254])], 'bad.txt'), () => {})).rejects.toThrow('UTF-8'); });
  it('detects structured and stacktrace formats', () => { expect(detectFormat('{"error":"timeout"}')).toBe('JSON'); expect(detectFormat('Traceback (most recent call last):')).toBe('Python traceback'); expect(detectFormat('panic: runtime error')).toBe('Go panic'); expect(detectFormat('at com.foo.Main(Main.java:42)')).toBe('Java stack trace'); });
});
describe('anonymization rules', () => {
  it('masks emails', () => { expect(maskSensitive('user@example.com').text).toBe('[EMAIL]'); });
  it('masks IPv4 and IPv6', () => { expect(maskSensitive('192.168.1.8 2001:db8::1').text).toBe('[IP] [IP]'); });
  it('masks valid card numbers', () => { expect(maskSensitive('4111 1111 1111 1111').text).toBe('[CARD]'); });
  it('masks bearer tokens and secrets', () => { expect(maskSensitive('Bearer abc.def.ghi api_key=private123').text).toBe('[TOKEN] [SECRET]'); });
  it('masks refresh credentials, URL credentials and cookies', () => { const r = maskSensitive('refresh_token=abc client_secret=def postgres://user:pass@db/app\nCookie: session=ghi').text; expect(r).not.toContain('abc'); expect(r).not.toContain('def'); expect(r).not.toContain('user:pass'); expect(r).not.toContain('session=ghi'); });
  it('preserves timestamps and invalid IPs', () => { expect(maskSensitive('2026-10-22T06:40:00Z 999.2.3.4').text).toBe('2026-10-22T06:40:00Z 999.2.3.4'); });
});