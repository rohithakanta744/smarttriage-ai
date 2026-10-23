import { Sparkles, Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAMPLE_INCIDENTS } from "@/lib/demo-diagnoses";

export function LogInput({
  value,
  onChange,
  onSubmit,
  isPending,
  stage,
  selectedSample,
  onSelectedSampleChange,
  onLoadSample,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  stage: string;
  selectedSample: string;
  onSelectedSampleChange: (id: string) => void;
  onLoadSample: () => void;
}) {
  return (
    <section className="flex min-h-[60vh] flex-col rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          raw_input.log
        </span>
        <details className="max-w-full">
          <summary className="cursor-pointer text-xs text-muted-foreground">Examples & onboarding</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select value={selectedSample} onValueChange={onSelectedSampleChange}>
            <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Choose sample incident">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAMPLE_INCIDENTS.map((sample) => (
                <SelectItem key={sample.id} value={sample.id}>
                  {sample.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={onLoadSample}>
            <Shuffle className="size-3.5" />
            <span className="hidden sm:inline">Load sample</span>
          </Button>
        </div>
        </details>
      </div>
      <Textarea
        value={value}
        disabled={isPending}
        aria-label="Production error log"
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="Paste raw production error log or JSON alert here..."
        className="min-h-[42vh] flex-1 resize-none rounded-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <span className="font-mono text-xs text-muted-foreground">
          {value.length.toLocaleString()} chars
        </span>
        <Button onClick={onSubmit} disabled={isPending || !value.trim()} className="max-w-full gap-2 whitespace-normal text-left">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
               {stage}
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Diagnose Log
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
