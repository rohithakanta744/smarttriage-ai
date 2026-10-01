import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <DialogFooter>
          <Button
            disabled={!draft.trim()}
            onClick={() => {
              onSave(draft.trim());
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
