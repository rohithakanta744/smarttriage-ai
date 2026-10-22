import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, X } from "lucide-react";
import { Button } from './ui/button';

export function PushConfirmation() {
  const [dismissed, setDismissed] = useState(false);
  const [commit, setCommit] = useState<{ sha: string; url: string; date: string } | null>(null);
  useEffect(() => { let live = true; void fetch('https://api.github.com/repos/rohithakanta744/smarttriage-ai/commits/main').then(async res => { if (!res.ok) return; const data = await res.json(); if (live && typeof data.sha === 'string' && typeof data.commit?.committer?.date === 'string') setCommit({ sha: data.sha, date: data.commit.committer.date, url: `https://github.com/rohithakanta744/smarttriage-ai/commit/${data.sha}` }); }).catch(() => {}); return () => { live = false; }; }, []);
  if (dismissed) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sev-medium" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">GitHub repository</p>
        <p className="mt-0.5 text-muted-foreground">
          {commit ? <>Latest <code className="font-mono text-xs">{commit.sha.slice(0,8)}</code> · {new Date(commit.date).toISOString().replace('T',' · ').replace('.000Z',' UTC')}</> : 'rohithakanta744 / smarttriage-ai · live commit unavailable'}
        </p>
        <a
          href={commit?.url ?? 'https://github.com/rohithakanta744/smarttriage-ai'}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {commit ? 'Verify latest commit' : 'Open repository'} <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
      <Button variant="ghost" size="icon"
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss push confirmation"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
