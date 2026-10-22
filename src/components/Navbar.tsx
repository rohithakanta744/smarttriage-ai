import { Cloud, FlaskConical, Sparkles, BookOpen } from "lucide-react";
import { Link } from '@tanstack/react-router';
import { Button } from "@/components/ui/button";
import { ApiSettingsDialog } from "./ApiSettingsDialog";
import { SmartTriageLogo } from "./SmartTriageLogo";
import { HowToUse } from './HowToUse';

export type DiagnosisMode = "demo" | "backend" | "cloud";

export function Navbar({
  apiBaseUrl,
  onSaveApiBaseUrl,
  mode,
  onModeChange,
}: {
  apiBaseUrl: string;
  onSaveApiBaseUrl: (next: string) => void;
  mode: DiagnosisMode;
  onModeChange: (mode: DiagnosisMode) => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
       <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SmartTriageLogo className="size-7 shrink-0" />
          <span className="truncate text-sm font-semibold tracking-tight">SmartTriage AI</span>
          <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
            v1.0 prototype
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HowToUse />
          <div className="flex rounded-md border border-border p-0.5" aria-label="Diagnosis mode">
            <Button variant={mode === 'cloud' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1 px-2" onClick={() => onModeChange('cloud')}><Sparkles className="size-3.5" />Hosted AI</Button>
            <Button
              variant={mode === "demo" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2 sm:gap-1.5 sm:px-2.5"
              onClick={() => onModeChange("demo")}
            >
              <FlaskConical className="size-3.5" /> Demo
            </Button>
            <Button
              variant={mode === "backend" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1 px-2 sm:gap-1.5 sm:px-2.5"
              onClick={() => onModeChange("backend")}
            >
              <Cloud className="size-3.5" /> Backend
            </Button>
          </div>
          <Button asChild variant="ghost" size="icon" title="Team guide"><Link to="/guide" aria-label="Team guide"><BookOpen className="size-4" /></Link></Button>
          {mode === "backend" && (
            <>
              <span className="hidden max-w-56 truncate font-mono text-xs text-muted-foreground lg:inline">
                {apiBaseUrl}
              </span>
              <ApiSettingsDialog value={apiBaseUrl} onSave={onSaveApiBaseUrl} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
