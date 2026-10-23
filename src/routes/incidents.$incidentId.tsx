import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, CheckCircle2, RotateCcw, Trash2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { readIncidents, saveIncident, deleteIncident, type Incident } from "@/lib/incidents";

export const Route = createFileRoute("/incidents/$incidentId")({
  head: () => ({
    meta: [
      { title: "Incident investigation — SmartTriage AI" },
      { name: "description", content: "Ask follow-up questions about a triaged incident until it is resolved." },
      { property: "og:title", content: "Incident investigation — SmartTriage AI" },
      { property: "og:description", content: "Follow-up investigation thread for a triaged production incident." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IncidentPage,
});

function IncidentPage() {
  const { incidentId } = Route.useParams();
  const [incident, setIncident] = useState<Incident | null | undefined>(undefined);
  useEffect(() => { setIncident(readIncidents().find(i => i.id === incidentId) ?? null); }, [incidentId]);
  if (incident === undefined) return <div className="p-8 text-sm text-muted-foreground">Loading incident…</div>;
  if (!incident) return <div className="mx-auto max-w-3xl p-8"><p className="text-sm">This incident is not saved in this browser.</p><Button asChild variant="outline" className="mt-4"><Link to="/"><ArrowLeft className="size-4" />Back to console</Link></Button></div>;
  return <Thread incident={incident} onChange={setIncident} />;
}

function Thread({ incident, onChange }: { incident: Incident; onChange: (i: Incident | null) => void }) {
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/incident-chat", body: { log: incident.log, diagnosis: incident.diagnosis } }), [incident.log, incident.diagnosis]);
  const { messages, sendMessage, status, error, stop } = useChat({ id: incident.id, messages: incident.messages, transport });
  useEffect(() => {
    if (status === "ready" && messages.length !== incident.messages.length) {
      const next = { ...incident, messages };
      saveIncident(next); onChange(next);
    }
  }, [status, messages, incident, onChange]);
  const busy = status === "submitted" || status === "streaming";
  const setStatus = (s: Incident["status"]) => { const next = { ...incident, status: s, messages }; saveIncident(next); onChange(next); };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="size-4" />Console</Link></Button>
          <div className="flex gap-2">
            {incident.status === "open"
              ? <Button size="sm" variant="outline" onClick={() => setStatus("resolved")}><CheckCircle2 className="size-4" />Mark resolved</Button>
              : <Button size="sm" variant="outline" onClick={() => setStatus("open")}><RotateCcw className="size-4" />Reopen</Button>}
            <Button size="sm" variant="ghost" aria-label="Delete incident" onClick={() => { if (window.confirm("Delete this incident thread?")) { deleteIncident(incident.id); onChange(null); } }}><Trash2 className="size-4" /></Button>
          </div>
        </div>
        <header className="border-b border-border pb-4">
          <div className="flex items-center gap-2"><SeverityBadge severity={incident.diagnosis.severity} /><span className="text-xs uppercase text-muted-foreground">{incident.status}</span></div>
          <h1 className="mt-2 break-words font-mono text-sm">{incident.title}</h1>
          <p className="mt-3 text-sm">{incident.diagnosis.root_cause}</p>
          <p className="mt-2 text-sm text-muted-foreground">{incident.diagnosis.recommended_action}</p>
        </header>
        <Conversation className="min-h-80 rounded-md border border-border">
          <ConversationContent>
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Ask a follow-up, e.g. “How do I confirm this root cause?”</p>}
            {messages.map(m => (
              <Message key={m.id} from={m.role}>
                <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : ""}>
                  {m.parts.map((p, i) => p.type === "text" ? <MessageResponse key={i}>{p.text}</MessageResponse> : null)}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="size-4 animate-pulse" />Investigating…</p>}
            {error && <p className="text-sm text-destructive">The AI could not answer. Your thread is preserved; try again later.</p>}
          </ConversationContent>
        </Conversation>
        <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); const t = input.trim(); if (!t || busy) return; void sendMessage({ text: t }); setInput(""); }}>
          <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about this incident" aria-label="Follow-up question" maxLength={4000} disabled={incident.status === "resolved"} />
          <div className="flex justify-end gap-2">
            {busy && <Button type="button" variant="outline" onClick={() => void stop()}>Stop</Button>}
            <Button type="submit" disabled={busy || !input.trim() || incident.status === "resolved"}>Send</Button>
          </div>
        </form>
      </main>
    </div>
  );
}
