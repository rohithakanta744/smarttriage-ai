import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  CRITICAL: "bg-sev-critical/10 text-sev-critical border-sev-critical/30",
  HIGH: "bg-sev-high/10 text-sev-high border-sev-high/30",
  MEDIUM: "bg-sev-medium/10 text-sev-medium border-sev-medium/30",
  LOW: "bg-muted text-muted-foreground border-border",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const key = severity.trim().toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1 font-mono text-xs font-bold tracking-widest uppercase",
        styles[key] ?? styles["LOW"],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {key || "UNKNOWN"}
    </span>
  );
}
