"use client";

import { X } from "lucide-react";
import { StakeholderAvatar } from "./stakeholder-avatar";
import { AffiliationBadge } from "./affiliation";

export interface OrgStakeholder {
  id: string; name: string; email?: string; role?: string;
  affiliation?: string; organization?: string; managerId?: string | null;
}

type Node = OrgStakeholder & { children: Node[] };

function buildTree(list: OrgStakeholder[]): Node[] {
  const byId = new Map(list.map((s) => [s.id, { ...s, children: [] as Node[] }]));
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.managerId ? byId.get(node.managerId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function NodeCard({ n }: { n: Node }) {
  return (
    <li>
      <div className="orgcard inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
        <StakeholderAvatar name={n.name} email={n.email} size={34} />
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground whitespace-nowrap">{n.name || "Unnamed"}</p>
            <AffiliationBadge value={n.affiliation} />
          </div>
          {(n.role || n.organization) && (
            <p className="text-xs text-muted whitespace-nowrap">
              {n.role}{n.role && n.organization ? " · " : ""}{n.organization}
            </p>
          )}
        </div>
      </div>
      {n.children.length > 0 && (
        <ul>
          {n.children.map((c) => <NodeCard key={c.id} n={c} />)}
        </ul>
      )}
    </li>
  );
}

export function OrgChartModal({ stakeholders, onClose }: { stakeholders: OrgStakeholder[]; onClose: () => void }) {
  const roots = buildTree(stakeholders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_120ms_ease-out]" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-surface shadow-2xl animate-[scaleIn_140ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Stakeholder Org Chart</h3>
            <p className="text-xs text-muted">Reporting structure — who works under whom</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <div className="overflow-auto p-8 flex-1">
          {stakeholders.length === 0 ? (
            <p className="text-sm text-muted text-center">No stakeholders yet.</p>
          ) : (
            <div className="orgtree min-w-max mx-auto">
              <ul>
                {roots.map((r) => <NodeCard key={r.id} n={r} />)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .orgtree ul { display:flex; justify-content:center; padding-top:22px; position:relative; }
        .orgtree li { list-style:none; display:flex; flex-direction:column; align-items:center; position:relative; padding:22px 12px 0; }
        .orgtree li::before, .orgtree li::after {
          content:""; position:absolute; top:0; right:50%;
          border-top:1px solid rgb(var(--border)); width:50%; height:22px;
        }
        .orgtree li::after { right:auto; left:50%; border-left:1px solid rgb(var(--border)); }
        .orgtree li:only-child::before, .orgtree li:only-child::after { display:none; }
        .orgtree li:only-child { padding-top:22px; }
        .orgtree li:first-child::before, .orgtree li:last-child::after { border:0 none; }
        .orgtree li:last-child::before { border-right:1px solid rgb(var(--border)); border-radius:0 6px 0 0; }
        .orgtree li:first-child::after { border-radius:6px 0 0 0; }
        .orgtree ul ul::before {
          content:""; position:absolute; top:0; left:50%;
          border-left:1px solid rgb(var(--border)); width:0; height:22px;
        }
        .orgtree > ul { padding-top:0; }
        .orgtree > ul > li:only-child::before, .orgtree > ul > li::before, .orgtree > ul > li::after { /* roots: no upward line */ }
        .orgtree > ul > li { padding-top:0; }
        .orgtree > ul > li::before, .orgtree > ul > li::after { display:none; }
      `}</style>
    </div>
  );
}
