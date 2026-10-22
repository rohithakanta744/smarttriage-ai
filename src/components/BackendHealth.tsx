import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { pingExternal } from '@/lib/external-backend';
import type { DiagnosisMode } from './Navbar';

export function BackendHealth({ mode, base }: { mode: DiagnosisMode; base: string }) {
  const [status, setStatus] = useState('Not checked'); const [checking, setChecking] = useState(false);
  async function ping() { setChecking(true); setStatus('Checking'); try { setStatus(`Connected · ${await pingExternal(base)} ms`); } catch (e) { setStatus(e instanceof Error ? e.message : 'Unreachable'); } finally { setChecking(false); } }
  useEffect(() => { if (mode !== 'backend') return; let live = true; const check = async () => { if (!live) return; await ping(); }; void check(); const timer = setInterval(check, 30000); return () => { live = false; clearInterval(timer); }; }, [mode, base]);
  if (mode !== 'backend') return <span className="text-xs text-muted-foreground">{mode === 'demo' ? 'Offline sample engine' : 'Hosted AI · ready for requests'}</span>;
  return <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${checking ? 'bg-sev-medium' : status.startsWith('Connected') ? 'bg-chart-2' : 'bg-destructive'}`} /><span className="max-w-64 truncate text-xs text-muted-foreground" title={status}>{status}</span><Button variant="ghost" size="icon" className="size-7" title="Ping backend" aria-label="Ping backend" disabled={checking} onClick={() => void ping()}><RefreshCw className={`size-3.5 ${checking ? 'animate-spin' : ''}`} /></Button></div>;
}