"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Plus, MessageSquare, ChevronDown, Loader2, Sparkles, Wrench, Brain, ExternalLink, AlertCircle, FileText, X, Trash2 } from "lucide-react";
import { Markdown } from "./markdown";
import { DocumentViewer } from "./document-viewer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Artifact = { type?: string; id?: string; label?: string; href?: string };
type Step = { id?: string; idx: number; type: string; skillSlug?: string | null; title?: string | null; content?: { text?: string; input?: unknown; artifact?: Artifact; error?: string } | null };
type Run = { id: string; goal: string; answer?: string | null; status: string; model?: string | null; createdAt: string; steps: Step[] };
type ConversationLite = { id: string; title: string; lastMessageAt: string };
type Conversation = { id: string; title: string; runs: Run[] };
type Mentionable = { type: string; id: string; label: string; sublabel?: string };

const MENTION_DOT: Record<string, string> = { document: "#f59e0b", diagram: "#6366f1", meeting: "#10b981", member: "#64748b" };

export function ProjectChat({ projectId }: { projectId: string }) {
  const [conversations, setConversations] = useState<ConversationLite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<string | null>(null); // optimistic user message
  const [live, setLive] = useState<{ steps: Step[]; answer: string } | null>(null); // streaming turn
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [mentions, setMentions] = useState<Mentionable[]>([]);
  const [mq, setMq] = useState<string | null>(null); // active @-query, or null
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = () =>
    fetch(`${API_BASE}/agent/conversations?projectId=${projectId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : [])).then(setConversations).catch(() => {});

  const loadConversation = (id: string) =>
    fetch(`${API_BASE}/agent/conversations/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Conversation | null) => { if (c) setRuns(c.runs ?? []); })
      .catch(() => {});

  useEffect(() => {
    loadConversations();
    fetch(`${API_BASE}/agent/mentionables?projectId=${projectId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : [])).then(setMentionables).catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [projectId]);
  useEffect(() => { if (activeId) loadConversation(activeId); }, [activeId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [runs, pending]);

  const newChat = () => { setActiveId(null); setRuns([]); setSwitcherOpen(false); setMentions([]); };

  const deleteChat = async (id: string) => {
    await fetch(`${API_BASE}/agent/conversations/${id}`, { credentials: "include", method: "DELETE" }).catch(() => {});
    if (id === activeId) newChat();
    loadConversations();
  };

  const onInput = (v: string) => {
    setInput(v);
    const m = /(?:^|\s)@([\w-]*)$/.exec(v);
    setMq(m ? m[1].toLowerCase() : null);
  };
  const pickMention = (item: Mentionable) => {
    setInput((prev) => prev.replace(/@([\w-]*)$/, `@${item.label} `));
    setMentions((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]));
    setMq(null);
  };
  const mentionMatches = mq !== null
    ? mentionables.filter((m) => m.label.toLowerCase().includes(mq)).slice(0, 8)
    : [];

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    const sentMentions = mentions;
    setInput(""); setPending(q); setSending(true); setMq(null); setMentions([]);

    let convId = activeId;
    if (!convId) {
      const c = await fetch(`${API_BASE}/agent/conversations`, {
        credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (!c?.id) { setSending(false); setPending(null); return; }
      convId = c.id; setActiveId(c.id);
    }

    setLive({ steps: [], answer: "" });
    try {
      const res = await fetch(`${API_BASE}/agent/ask/stream`, {
        credentials: "include", method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, projectId, conversationId: convId, mentions: sentMentions.map((m) => ({ type: m.type, id: m.id })) }),
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() ?? "";
        for (const block of blocks) {
          const line = block.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let ev: { type: string; step?: Step };
          try { ev = JSON.parse(payload); } catch { continue; }
          if (ev.type === "step" && ev.step) {
            const s = ev.step;
            setLive((prev) => prev ? {
              steps: [...prev.steps, s],
              answer: s.type === "text" ? prev.answer + (prev.answer ? "\n" : "") + (s.content?.text ?? "") : prev.answer,
            } : prev);
          }
        }
      }
    } catch { /* fall through to reload */ }

    setSending(false); setPending(null); setLive(null);
    await loadConversation(convId!);
    loadConversations();
  };

  const activeTitle = conversations.find((c) => c.id === activeId)?.title;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface shadow-sm h-[82vh] min-h-[520px] overflow-hidden">
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
                <div key={c.id} className={`group flex items-center gap-1 pr-1.5 hover:bg-surface-2 ${c.id === activeId ? "bg-surface-2/60" : ""}`}>
                  <button onClick={() => { setActiveId(c.id); setSwitcherOpen(false); }}
                    className={`flex-1 min-w-0 text-left px-3 py-2 text-sm truncate ${c.id === activeId ? "text-foreground" : "text-muted"}`}>
                    {c.title}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} title="Delete chat"
                    className="p-1 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
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
            {runs.map((run) => <Turn key={run.id} run={run} projectId={projectId} onOpenDoc={setOpenDoc} />)}
            {pending && (
              <div className="space-y-3">
                <UserBubble text={pending} />
                <div className="flex justify-start">
                  <div className="max-w-[90%] w-full space-y-2">
                    {live && live.steps.filter((s) => s.type !== "text").length > 0 && (
                      <Trace steps={live.steps.filter((s) => s.type !== "text")} defaultOpen />
                    )}
                    {live?.answer ? (
                      <div className="inline-block rounded-2xl rounded-bl-md border border-border bg-surface-2/40 px-3.5 py-2 text-sm text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <Markdown projectId={projectId}>{live.answer}</Markdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted"><Loader2 size={13} className="animate-spin" /> {live && live.steps.length > 0 ? "Working…" : "Thinking…"}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 shrink-0 relative">
        {/* @-mention dropdown */}
        {mq !== null && mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-border bg-surface shadow-xl py-1 max-h-56 overflow-y-auto z-10">
            <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted">Mention</p>
            {mentionMatches.map((m) => (
              <button key={`${m.type}:${m.id}`} onClick={() => pickMention(m)} className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: MENTION_DOT[m.type] ?? "#64748b" }} />
                <span className="text-sm text-foreground truncate">{m.label}</span>
                <span className="ml-auto text-[10px] text-muted shrink-0">{m.type}{m.sublabel ? ` · ${m.sublabel}` : ""}</span>
              </button>
            ))}
          </div>
        )}

        {/* selected mention chips */}
        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {mentions.map((m) => (
              <span key={`${m.type}:${m.id}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2/50 px-1.5 py-0.5 text-[11px] text-foreground">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: MENTION_DOT[m.type] ?? "#64748b" }} />
                {m.label}
                <button onClick={() => setMentions((p) => p.filter((x) => x.id !== m.id))} className="text-muted hover:text-foreground"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setMq(null); if (e.key === "Enter" && !e.shiftKey && mq === null) { e.preventDefault(); send(); } }}
            placeholder="Ask the project assistant…  (@ to mention a doc, diagram, meeting or person)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-surface-2/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-blue-500/50 max-h-32"
          />
          <button onClick={send} disabled={sending || !input.trim()}
            className="grid place-items-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 shrink-0">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {openDoc && (
        <DocumentViewer
          projectId={projectId}
          documentId={openDoc}
          onClose={() => setOpenDoc(null)}
          onChanged={() => activeId && loadConversation(activeId)}
          onAmend={(title) => setInput(`Revise the document "${title}": `)}
        />
      )}
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

function Turn({ run, projectId, onOpenDoc }: { run: Run; projectId: string; onOpenDoc: (id: string) => void }) {
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
              <Markdown projectId={projectId}>{run.answer}</Markdown>
            </div>
          )}
          {run.status === "failed" && !run.answer && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={13} /> The run failed.</div>
          )}
          {artifacts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {artifacts.map((a, i) => (
                <ArtifactCard key={i} artifact={a} projectId={projectId} onOpenDoc={onOpenDoc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactCard({ artifact, projectId, onOpenDoc }: { artifact: Artifact; projectId: string; onOpenDoc: (id: string) => void }) {
  // Documents open in a viewer right here (approve / amend / export).
  if (artifact.type === "document" && artifact.id) {
    return (
      <button onClick={() => onOpenDoc(artifact.id!)}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">
        <FileText size={13} /> Drafted “{artifact.label || "document"}” — open to review &amp; approve <ExternalLink size={12} />
      </button>
    );
  }
  const href = artifact.href || (artifact.type === "diagram" && artifact.id ? `/projects/${projectId}/diagrams/${artifact.id}` : null);
  if (!href) return null;
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-xs text-blue-600 dark:text-blue-300 hover:bg-blue-600/20">
      <Sparkles size={13} /> {artifact.label || "Open artifact"} <ExternalLink size={12} />
    </Link>
  );
}

function Trace({ steps, defaultOpen = false }: { steps: Step[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const toolCalls = steps.filter((s) => s.type === "tool_call").length;
  return (
    <div className="rounded-lg border border-border bg-surface-2/20 text-xs">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-muted hover:text-foreground">
        <Brain size={13} /> Thinking{toolCalls > 0 ? ` · ${toolCalls} tool call${toolCalls > 1 ? "s" : ""}` : ""}
        <ChevronDown size={13} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1.5 border-t border-border pt-2">
          {steps.map((s, i) => {
            const input = s.content?.input ? JSON.stringify(s.content.input) : "";
            return (
              <div key={s.id ?? `${s.idx}-${i}`} className="text-[11px]">
                {s.type === "thinking" && <p className="text-muted italic whitespace-pre-wrap line-clamp-4">{s.content?.text}</p>}
                {s.type === "tool_call" && (
                  <p className="text-foreground flex items-start gap-1">
                    <Wrench size={11} className="text-amber-400 mt-0.5 shrink-0" />
                    <span className="font-medium">{s.title || s.skillSlug}</span>
                    {input && <code className="text-muted truncate">{input.length > 80 ? input.slice(0, 80) + "…" : input}</code>}
                  </p>
                )}
                {s.type === "tool_result" && <p className="text-muted pl-4 line-clamp-2">↳ {s.content?.text}</p>}
                {s.type === "error" && <p className="text-red-500 line-clamp-3">⚠ {s.content?.error}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
