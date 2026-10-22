import { useRef, useState } from 'react';
import { FileUp, ShieldCheck, Filter, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { detectFormat, ERROR_PATTERN, readLogFile } from '@/lib/log-processing';

export function IngestionTools({ raw, prepared, numbers, maskedCount, omitted, smart, masked, onSmart, onMasked, onImport }: {
  raw: string; prepared: string; numbers: number[]; maskedCount: number; omitted: number; smart: boolean; masked: boolean;
  onSmart: (v: boolean) => void; onMasked: (v: boolean) => void; onImport: (text: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null); const [progress, setProgress] = useState<number | null>(null); const [filename, setFilename] = useState(''); const [preview, setPreview] = useState(false); const [dragging, setDragging] = useState(false);
  async function importFile(file?: File) { if (!file) return; setProgress(0); try { const text = await readLogFile(file, setProgress); onImport(text); setFilename(file.name); toast.success('Log imported.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Import failed.'); } finally { setProgress(null); if (input.current) input.current.value = ''; } }
  return <section className="mb-4 space-y-3" aria-label="Log preparation">
    <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void importFile(e.dataTransfer.files[0]); }} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4 ${dragging ? 'border-primary bg-accent' : 'border-border bg-muted/30'}`}>
      <div className="flex min-w-0 items-center gap-3"><FileUp className="size-5 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate text-sm font-medium">{progress !== null ? `Reading file · ${progress}%` : filename || 'Drop a log file'}</p><p className="text-xs text-muted-foreground">LOG · TXT · JSON · JSONL · CSV · TSV · HAR · GZIP / 20 MB</p></div></div>
      <input ref={input} type="file" className="hidden" aria-label="Upload log file" accept=".log,.txt,.json,.jsonl,.csv,.tsv,.har,.gz" onChange={e => void importFile(e.target.files?.[0])} />
      <Button size="sm" variant="outline" disabled={progress !== null} onClick={() => input.current?.click()}><FileUp className="size-4" />Browse files</Button>
    </div>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
      <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-muted-foreground" /><Switch id="mask" checked={masked} onCheckedChange={onMasked} /><Label htmlFor="mask">Anonymize</Label><span className="text-muted-foreground">{maskedCount} masked</span></div>
      <div className="flex items-center gap-2"><Filter className="size-4 text-muted-foreground" /><Switch id="smart" checked={smart} onCheckedChange={onSmart} /><Label htmlFor="smart">Smart extraction</Label></div>
      <span className="font-mono text-muted-foreground">{detectFormat(raw)} · {prepared.length.toLocaleString()} / 50,000 chars{omitted > 0 ? ` · ${omitted.toLocaleString()} lines omitted` : ''}</span>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setPreview(!preview)}><Eye className="size-4" />{preview ? 'Hide preview' : 'Prepared log'}</Button>
    </div>
    {!masked && <p className="text-xs text-destructive">External FastAPI receives unmasked input. Hosted AI, team history and exported reports always apply masking.</p>}
    {preview && <div className="max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs" aria-label="Prepared log preview">{prepared.split('\n').map((line, i) => <div key={i} className={`flex gap-4 ${ERROR_PATTERN.test(line) ? 'bg-sev-high/10 text-sev-high' : 'text-muted-foreground'}`}><span className="w-12 shrink-0 text-right text-muted-foreground">{numbers[i] ?? i + 1}</span><span className="min-w-0 whitespace-pre-wrap break-all">{line || ' '}</span></div>)}</div>}
  </section>;
}