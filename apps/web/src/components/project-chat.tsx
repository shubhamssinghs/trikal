"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Plus, MessageSquare, ChevronDown, Loader2, Sparkles, Wrench, Brain, ExternalLink, AlertCircle } from "lucide-react";
import { Markdown } from "./markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Artifact = { type?: string; id?: string; label?: string; href?: string };
type Step = { id: string; idx: number; type: string; skillSlug?: string | null; title?: string | null; content?: { text?: string; input?: unknown; artifact?: Artifact; error?: string } | null };
type Run = { id: string; goal: string; answer?: string | null; status: string; model?: string | null; createdAt: string; steps: Step[] };
type ConversationLite = { id: string; title: string; lastMessageAt: string };
type Conversation = { id: string; title: string; runs: Run[] };

export function ProjectChat({ projectId }: { projectId: string }) {
  const [conversations, setConversations] = useState<ConversationLite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<string | null>(null); // optimistic user message
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = () =>
    fetch(`${API_BASE}/agent/conversations?projectId=${projectId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : [])).then(setConversations).catch(() => {});

  const loadConversation = (id: string) =>
    fetch(`${API_BASE}/agent/conversations/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Conversation | null) => { if (c) setRuns(c.runs ?? []); })
      .catch(() => {});

  useEffect(() => { loadConversations(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);
  useEffect(() => { if (activeId) loadConversation(activeId); }, [activeId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [runs, pending]);

  const newChat = () => { setActiveId(null); setRuns([]); setSwitcherOpen(false); };

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput(""); setPending(q); setSending(true);

    let convId = activeId;
    if (!convId) {
      const c = await fetch(`${API_BASE}/agent/conversations`, {
        credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!c?.id) { setSending(false); setPending(null); return; }
      convId = c.id; setActiveId(c.id);
    }

    await fetch(`${API_BASE}/agent/ask`, {
      credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, projectId, conversationId: convId }),
    }).catch(() => {});

    setSending(false); setPending(null);
    await loadConversation(convId!);
    loadConversations();
  };

  const activeTitle = conversations.find((c) => c.id === activeId)?.title;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface shadow-sm h-[72vh] min-h-[480px] overflow-hidden">
      {/* Header: thread switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 shrink-0">
        <div className="relative">
          <button onClick={() => setSwitcherOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80">
            <MessageSquare size={15} className="text-blue-400" />
            <span className="truncate max-w-[260px]">{activeTitle || "New chat"}</span>
            <ChevronDown size={14} className="text-muted" />
          </button>
          {switcherOpen && (
            <div className="absolute z-20 mt-1 w-72 rounded-lg border border-border bg-surface shadow-xl py-1 max-h-80 overflow-y-auto">
              <button onClick={newChat} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-surface-2"><Plus size={14} /> New chat</button>
              <div className="border-t border-border my-1" />
              {conversations.length === 0 ? <p className="px-3 py-2 text-xs text-muted">No conversations yet.</p> : conversations.map((c) => (
                <button key={c.id} onClick={() => { setActiveId(c.id); setSwitcherOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-surface-2 ${c.id === activeId ? "text-foreground bg-surface-2/60" : "text-muted"}`}>
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={newChat} title="New chat" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"><Plus size={14} /> New</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {runs.length === 0 && !pending ? (
          <div className="h-full grid place-items-center text-center">
            <div>
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-blue-600/10 text-blue-400 mx-auto mb-3"><Sparkles size={20} /></div>
              <p className="text-sm font-medium text-foreground">Ask anything about this project</p>
              <p className="text-xs text-muted mt-1 max-w-sm">The assistant can search the knowledge base (incl. Granola meetings), draft diagrams, and more — and remembers the conversation.</p>
            </div>
          </div>
        ) : (
          <>
            {runs.map((run) => <Turn key={run.id} run={run} projectId={projectId} />)}
            {pending && (
              <div className="space-y-3">
                <UserBubble text={pending} />
                <div className="flex items-center gap-2 text-xs text-muted"><Loader2 size={13} className="animate-spin" /> Thinking…</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask the project assistant…  (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-blue-500/50 max-h-32"
          />
          <button onClick={send} disabled={sending || !input.trim()}
            className="grid place-items-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </section>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 text-white px-3.5 py-2 text-sm whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function Turn({ run, projectId }: { run: Run; projectId: string }) {
  const artifacts = run.steps.filter((s) => s.type === "tool_result" && s.content?.artifact).map((s) => s.content!.artifact!);
  const traceSteps = run.steps.filter((s) => s.type !== "text");
  return (
    <div className="space-y-3">
      <UserBubble text={run.goal} />
      <div className="flex justify-start">
        <div className="max-w-[90%] space-y-2">
          {traceSteps.length > 0 && <Trace steps={traceSteps} />}
          {run.answer && (
            <div className="inline-block rounded-2xl rounded-bl-md border border-border bg-surface-2/40 px-3.5 py-2 text-sm text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Markdown>{run.answer}</Markdown>
            </div>
          )}
          {run.status === "failed" && !run.answer && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={13} /> The run failed.</div>
          )}
          {artifacts.map((a, i) => (
            <ArtifactCard key={i} artifact={a} projectId={projectId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtifactCard({ artifact, projectId }: { artifact: Artifact; projectId: string }) {
  const href = artifact.href || (artifact.type === "diagram" && artifact.id ? `/projects/${projectId}/diagrams/${artifact.id}` : null);
  if (!href) return null;
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-xs text-blue-300 hover:bg-blue-600/20">
      <Sparkles size={13} /> {artifact.label || "Open artifact"} <ExternalLink size={12} />
    </Link>
  );
}

function Trace({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);
  const toolCalls = steps.filter((s) => s.type === "tool_call").length;
  return (
    <div className="rounded-lg border border-border bg-surface-2/20 text-xs">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-muted hover:text-foreground">
        <Brain size={13} /> Thinking{toolCalls > 0 ? ` · ${toolCalls} tool call${toolCalls > 1 ? "s" : ""}` : ""}
        <ChevronDown size={13} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-border pt-2">
          {steps.map((s) => (
            <div key={s.id} className="text-[11px]">
              {s.type === "thinking" && <p className="text-muted italic whitespace-pre-wrap">{s.content?.text}</p>}
              {s.type === "tool_call" && <p className="text-foreground inline-flex items-center gap-1"><Wrench size={11} className="text-amber-400" /> {s.title || s.skillSlug}<code className="ml-1 text-muted">{JSON.stringify(s.content?.input)}</code></p>}
              {s.type === "tool_result" && <p className="text-muted pl-4">↳ {s.content?.text}</p>}
              {s.type === "error" && <p className="text-red-500">⚠ {s.content?.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
