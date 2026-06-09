"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidBlock, DiagramEmbed } from "./diagram/diagram-embed";

function nodeText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(nodeText).join("");
  return "";
}

/** Themed markdown renderer (no typography plugin) — used for AI notes, agent answers, etc. */
function makeComponents(projectId?: string): Components {
  return {
  ...components,
  code: ({ className, children }) => {
    const lang = /language-(\w+)/.exec(className || "")?.[1];
    if (lang === "mermaid") return <MermaidBlock code={nodeText(children)} />;
    if (lang === "diagram") return <DiagramEmbed diagramId={nodeText(children).trim()} projectId={projectId} />;
    return <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono text-foreground">{children}</code>;
  },
  };
}

const components: Components = {
  h1: ({ children }) => <h1 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[13px] font-semibold text-foreground mt-3 mb-1 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mt-2.5 mb-1">{children}</h4>,
  p: ({ children }) => <p className="text-xs text-foreground leading-relaxed my-1.5">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5 marker:text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5 marker:text-muted">{children}</ol>,
  li: ({ children }) => <li className="text-xs text-foreground leading-relaxed">{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-words">{children}</a>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px] font-mono text-foreground">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-3 my-1.5 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-xs border border-border">{children}</table></div>,
  th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold bg-surface-2/50">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
};

export function Markdown({ children, projectId }: { children: string; projectId?: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents(projectId)}>{children}</ReactMarkdown>;
}
