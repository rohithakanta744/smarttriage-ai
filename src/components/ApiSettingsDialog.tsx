import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { backendUrl } from '@/lib/external-backend';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ApiSettingsDialog({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="size-4" />
          <span className="hidden sm:inline">API endpoint</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Diagnosis service endpoint</DialogTitle>
          <DialogDescription>
             Base address of your FastAPI service. Requests are sent to{" "}
             <span className="font-mono">/api/diagnose</span> on that host.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="api-base">Base URL</Label>
          <Input
            id="api-base"
            value={draft}
             placeholder="http://localhost:8000"
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2 border-t border-border pt-3 text-sm text-muted-foreground"><p>No service yet? Download the ready-to-run FastAPI kit. It calls live AI using your own private API key; it never returns demo diagnoses.</p><Button asChild variant="outline" size="sm"><a href="/backend-kit/smarttriage-fastapi.zip" download>Download FastAPI service kit</a></Button><p>Follow the included README: configure your key, model and allowed app origin; start the service; save its address here and check health. Your Python service runs on your own computer or hosting, not inside this app.</p></div>
        <DialogFooter>
          <Button
            disabled={!draft.trim()}
            onClick={() => {
              try { backendUrl(draft.trim(), '/health'); onSave(draft.trim()); setOpen(false); } catch (error) { toast.error(error instanceof Error ? error.message : 'Enter a valid service address.'); }
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
