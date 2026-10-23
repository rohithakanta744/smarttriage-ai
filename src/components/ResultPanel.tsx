import { AlertTriangle, Copy, ExternalLink, ListChecks, Search, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "./SeverityBadge";
import type { Diagnosis } from "@/lib/diagnose.functions";
import { buildReport, downloadText, downloadPdf } from '@/lib/reports';

function Card({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {title}
      </div>
      <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-foreground">{body}</p>
    </article>
  );
}

export function ResultPanel({
  diagnosis,
  error,
  isPending,
  stage,
  log,
}: {
  diagnosis: Diagnosis | null;
  error: string | null;
  isPending: boolean;
  stage: string;
  log: string;
}) {
  if (isPending) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-border">
        <Terminal className="size-6 animate-pulse text-muted-foreground" />
        <p className="mt-3 font-mono text-sm text-muted-foreground">{stage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-lg border border-sev-critical/30 bg-sev-critical/5 p-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto size-6 text-sev-critical" />
          <p className="mt-3 text-sm font-medium text-foreground">Diagnosis failed</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-border">
        <Search className="size-6 text-muted-foreground" />
        <p className="mt-3 font-mono text-sm text-muted-foreground">Awaiting log input...</p>
      </div>
    );
  }

  const report = buildReport(diagnosis, log);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Diagnosis copied for sharing.");
    } catch {
      toast.error("Could not copy the diagnosis.");
    }
  };

  const openTeams = () => {
    const url = new URL("https://teams.microsoft.com/share");
    url.searchParams.set("href", window.location.href);
    url.searchParams.set("msgText", report);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Severity
        </span>
        <SeverityBadge severity={diagnosis.severity} />
      </div>
      <Card
        icon={<AlertTriangle className="size-3.5" />}
        title="Root cause"
        body={diagnosis.root_cause}
      />
      {diagnosis.confidence !== undefined && <p className="text-xs text-muted-foreground">Model-estimated confidence: {diagnosis.confidence}% · not calibrated</p>}
      {!!diagnosis.evidence_lines?.length && <p className="font-mono text-xs text-muted-foreground">Evidence · submitted lines {diagnosis.evidence_lines.join(', ')}</p>}
      {!!diagnosis.sources?.length && <div className="text-xs text-muted-foreground"><p className="font-semibold">Retrieved runbooks</p>{diagnosis.sources.map((source,i) => <p key={`${source.id}-${source.chunk}`}>[{i+1}] {source.source} · chunk {source.chunk}</p>)}</div>}
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-2" onClick={copyReport}>
          <Copy className="size-4" /> Copy report
        </Button>
        <Button size="sm" className="gap-2" onClick={openTeams}>
          <ExternalLink className="size-4" /> Open in Teams
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadText(report, 'smarttriage-report.md')}>Markdown</Button>
        <Button variant="outline" size="sm" onClick={() => void downloadPdf(report).catch(() => toast.error('PDF export failed.'))}>PDF</Button>
        <Button variant="outline" size="sm" onClick={() => downloadText(buildReport(diagnosis, log, true), 'smarttriage-postmortem.md')}>Post-mortem</Button>
      </div>
      <Card
        icon={<ListChecks className="size-3.5" />}
        title="Recommended action"
        body={diagnosis.recommended_action}
      />
    </div>
  );
}
