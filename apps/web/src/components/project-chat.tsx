"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Send, Plus, MessageSquare, ChevronDown, Loader2, Sparkles, Wrench, Brain, ExternalLink, AlertCircle, FileText, X, Trash2, BookOpen, Globe, BarChart3, Table2, Sheet, Presentation } from "lucide-react";
import { Markdown } from "./markdown";
import { ArtifactPane, type ViewerItem } from "./artifact/artifact-pane";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Artifact = { type?: string; id?: string; label?: string; href?: string };
type Citation = { n: number; kind: "knowledge" | "web"; title: string; sourceType?: string; sourceId?: string; transcriptId?: string | null; snippet?: string; href?: string };
type Step = { id?: string; idx: number; type: string; skillSlug?: string | null; title?: string | null; content?: { text?: string; input?: unknown; artifact?: Artifact; error?: string; citations?: Citation[] } | null };
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
  const [viewer, setViewer] = useState<ViewerItem | null>(null);
  const lastFileKey = useRef<string | null>(null);
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

  // Every previewable artifact created across this conversation → the right-pane file list.
  // (milestones / risks / recommendations / skills are confirmations, not files.)
  const PREVIEWABLE = useMemo(() => new Set(["document", "chart", "table", "sheet", "slides", "diagram"]), []);
  const files = useMemo<ViewerItem[]>(() => {
    const out: ViewerItem[] = [];
    const seen = new Set<string>();
    for (const run of runs) {
      for (const s of run.steps) {
        const a = s.content?.artifact;
        if (s.type === "tool_result" && a?.id && a?.type && PREVIEWABLE.has(a.type)) {
          const k = `${a.type}:${a.id}`;
          if (!seen.has(k)) { seen.add(k); out.push(a); }
        }
      }
    }
    return out;
  }, [runs, PREVIEWABLE]);

  // Auto-open the newest file as it's created; keep the user's pick otherwise.
  useEffect(() => {
    if (!files.length) return;
    const newest = files[files.length - 1];
    const key = `${newest.type}:${newest.id}`;
    if (key !== lastFileKey.current) { lastFileKey.current = key; setViewer(newest); }
  }, [files]);

  // Resizable split: the files pane is only shown (on wide screens) when there's
  // something to show, and the divider can be dragged to resize it.
  const containerRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(42); // % width of the right pane
  const dragging = useRef(false);
  const [lgUp, setLgUp] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setLgUp(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rightPct = ((rect.right - e.clientX) / rect.width) * 100;
      setPaneWidth(Math.min(70, Math.max(25, rightPct)));
    };
    const onUp = () => { dragging.current = false; document.body.style.userSelect = ""; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, []);
  const showPane = lgUp && files.length > 0;

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
    <section className={`flex flex-col min-w-0 ${showPane ? "border-r border-border" : "flex-1"}`} style={showPane ? { width: `${100 - paneWidth}%` } : undefined}>
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
            {runs.map((run) => <Turn key={run.id} run={run} projectId={projectId} onOpen={setViewer} />)}
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

    </section>

    {/* Right pane: files the assistant created — only when there's something to show. */}
    {showPane && (
      <>
        <div
          onPointerDown={(e) => { dragging.current = true; document.body.style.userSelect = "none"; e.preventDefault(); }}
          title="Drag to resize"
          className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-blue-500/60 active:bg-blue-500/60 transition-colors"
        />
        <aside className="flex flex-col shrink-0 bg-surface-2/10" style={{ width: `${paneWidth}%` }}>
          <ArtifactPane
            items={files}
            selected={viewer}
            onSelect={setViewer}
            projectId={projectId}
            onChanged={() => { if (activeId) loadConversation(activeId); }}
          />
        </aside>
      </>
    )}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 text-white px-3.5 py-2 text-sm whitespace-pre-wrap">{text}</div>
    </div>
  );
}

const PREVIEWABLE_TYPES = new Set(["document", "chart", "table", "sheet", "slides", "diagram"]);

function Turn({ run, projectId, onOpen }: { run: Run; projectId: string; onOpen: (it: ViewerItem) => void }) {
  const artifacts = run.steps
    .filter((s) => s.type === "tool_result" && s.content?.artifact && PREVIEWABLE_TYPES.has(s.content.artifact.type ?? ""))
    .map((s) => s.content!.artifact!);
  const traceSteps = run.steps.filter((s) => s.type !== "text" && s.type !== "sources");
  const citations = run.steps.find((s) => s.type === "sources")?.content?.citations ?? [];
  const usedKb = run.steps.some((s) => s.type === "tool_call" && s.skillSlug === "search_project_knowledge") || citations.some((c) => c.kind === "knowledge");
  const usedWeb = run.steps.some((s) => s.type === "tool_call" && (s.skillSlug ?? "").startsWith("tavily")) || citations.some((c) => c.kind === "web");

  // Make inline [n] citations clickable — link to the matching source below.
  const citedNums = new Set(citations.map((c) => c.n));
  const answer = run.answer && citedNums.size
    ? run.answer.replace(/\[(\d+)\](?!\()/g, (m, d) => (citedNums.has(Number(d)) ? `[[${d}]](#src-${run.id}-${d})` : m))
    : run.answer;

  return (
    <div className="space-y-3">
      <UserBubble text={run.goal} />
      <div className="flex justify-start">
        <div className="max-w-[90%] space-y-2">
          {traceSteps.length > 0 && <Trace steps={traceSteps} />}
          {run.answer && (
            <div className="inline-block rounded-2xl rounded-bl-md border border-border bg-surface-2/40 px-3.5 py-2 text-sm text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Markdown projectId={projectId}>{answer!}</Markdown>
            </div>
          )}
          {(usedKb || usedWeb || citations.length > 0) && (
            <SourceFooter runId={run.id} projectId={projectId} citations={citations} usedKb={usedKb} usedWeb={usedWeb} />
          )}
          {run.status === "failed" && !run.answer && (
            <div className="inline-flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={13} /> The run failed.</div>
          )}
          {artifacts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {artifacts.map((a, i) => (
                <ArtifactCard key={i} artifact={a} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceFooter({ runId, projectId, citations, usedKb, usedWeb }: { runId: string; projectId: string; citations: Citation[]; usedKb: boolean; usedWeb: boolean }) {
  const [openSrc, setOpenSrc] = useState<Citation | null>(null);
  return (
    <div className="pt-0.5">
      {/* "Answered using" indicator */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <span>Answered using:</span>
        {usedKb && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-300">
            <BookOpen size={11} /> Project knowledge
          </span>
        )}
        {usedWeb && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-300">
            <Globe size={11} /> Web search
          </span>
        )}
        {!usedKb && !usedWeb && <span className="italic">general knowledge</span>}
      </div>

      {citations.length > 0 && (
        <div className="mt-1.5 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Sources</p>
          {citations.map((c) => (
            <div key={c.n} id={`src-${runId}-${c.n}`} className="flex items-start gap-1.5 text-xs scroll-mt-20">
              <span className="text-muted shrink-0">[{c.n}]</span>
              {c.kind === "web" && c.href ? (
                <a href={c.href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 min-w-0">
                  <span className="truncate">{c.title}</span><ExternalLink size={10} className="shrink-0" />
                </a>
              ) : (
                <button onClick={() => setOpenSrc(c)} className="text-left text-foreground hover:text-blue-400 min-w-0 inline-flex items-center gap-1">
                  <span className="truncate">{c.title}</span>
                  {c.sourceType && <span className="text-muted shrink-0">· {c.sourceType}</span>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {openSrc && <SourceModal projectId={projectId} citation={openSrc} onClose={() => setOpenSrc(null)} />}
    </div>
  );
}

function SourceModal({ projectId, citation, onClose }: { projectId: string; citation: Citation; onClose: () => void }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const passageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!citation.transcriptId) { setLoading(false); return; }
    let cancelled = false;
    fetch(`${API_BASE}/transcripts/${citation.transcriptId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setContent(d?.rawContent ?? null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [citation.transcriptId]);

  // Split the full text around the cited passage so we can highlight it inline.
  const snippet = (citation.snippet ?? "").trim();
  const parts = content && snippet ? splitAround(content, snippet) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">[{citation.n}] {citation.title}</h3>
            {citation.sourceType && <p className="text-[11px] text-muted mt-0.5">{citation.sourceType} · from the project knowledge base</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground shrink-0"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {snippet && (
            <div ref={passageRef}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Cited passage</p>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{snippet}</div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Loading source…</div>
          ) : parts ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Full source</p>
              <pre className="text-xs text-muted whitespace-pre-wrap font-sans leading-relaxed rounded-lg border border-border bg-surface-2/30 p-3 max-h-[40vh] overflow-y-auto">
                {parts.before}<mark className="bg-amber-300/40 text-foreground rounded px-0.5">{parts.match}</mark>{parts.after}
              </pre>
            </div>
          ) : content ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Full source</p>
              <pre className="text-xs text-muted whitespace-pre-wrap font-sans leading-relaxed rounded-lg border border-border bg-surface-2/30 p-3 max-h-[40vh] overflow-y-auto">{content}</pre>
            </div>
          ) : !snippet ? (
            <p className="text-sm text-muted">Source content isn’t available to preview.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Locate the cited snippet in the full text (whitespace-tolerant) for highlighting. */
function splitAround(full: string, snippet: string): { before: string; match: string; after: string } | null {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const probe = norm(snippet).slice(0, 60); // first ~60 chars are enough to locate
  if (!probe) return null;
  const idx = norm(full).indexOf(probe);
  if (idx < 0) return null;
  // Map the normalized index back approximately onto the original text.
  const approx = Math.max(0, full.toLowerCase().replace(/\s+/g, " ").indexOf(probe.toLowerCase()));
  const start = approx;
  const end = Math.min(full.length, start + snippet.length);
  return { before: full.slice(0, start), match: full.slice(start, end), after: full.slice(end) };
}

const ARTIFACT_META: Record<string, { Icon: React.ComponentType<{ size?: number; className?: string }>; label: string; cls: string }> = {
  document: { Icon: FileText, label: "Document", cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20" },
  chart: { Icon: BarChart3, label: "Chart", cls: "border-blue-500/30 bg-blue-600/10 text-blue-600 dark:text-blue-300 hover:bg-blue-600/20" },
  table: { Icon: Table2, label: "Table", cls: "border-blue-500/30 bg-blue-600/10 text-blue-600 dark:text-blue-300 hover:bg-blue-600/20" },
  sheet: { Icon: Sheet, label: "Spreadsheet", cls: "border-emerald-500/30 bg-emerald-600/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600/20" },
  slides: { Icon: Presentation, label: "Slides", cls: "border-blue-500/30 bg-blue-600/10 text-blue-600 dark:text-blue-300 hover:bg-blue-600/20" },
  diagram: { Icon: Sparkles, label: "Diagram", cls: "border-blue-500/30 bg-blue-600/10 text-blue-600 dark:text-blue-300 hover:bg-blue-600/20" },
};

/** A compact chip that opens the created file in the right-hand viewer pane. */
function ArtifactCard({ artifact, onOpen }: { artifact: Artifact; onOpen: (it: ViewerItem) => void }) {
  if (!artifact.id || !artifact.type) {
    if (!artifact.href) return null;
    return <Link href={artifact.href} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-xs text-blue-600 dark:text-blue-300 hover:bg-blue-600/20"><Sparkles size={13} /> {artifact.label || "Open"} <ExternalLink size={12} /></Link>;
  }
  const meta = ARTIFACT_META[artifact.type] ?? { Icon: FileText, label: artifact.type, cls: "border-border bg-surface-2/50 text-foreground hover:bg-surface-2" };
  const { Icon } = meta;
  return (
    <button onClick={() => onOpen(artifact)} title="Open in viewer"
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${meta.cls}`}>
      <Icon size={13} /> <span className="font-medium">{meta.label}:</span> <span className="max-w-[200px] truncate">{artifact.label || "open"}</span> <ExternalLink size={12} className="opacity-60" />
    </button>
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
