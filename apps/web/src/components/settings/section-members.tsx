"use client";

import { Card } from "../ui";

const ROLES = [
  { role: "Org Admin", perms: "Full access — manage everything, including settings and members" },
  { role: "Project Manager", perms: "Create/edit companies & projects, approve recommendations" },
  { role: "Member", perms: "Read projects, upload transcripts, view diagrams" },
  { role: "Viewer", perms: "Read-only access to projects and diagrams" },
];

export function MembersSection() {
  return (
    <div className="space-y-5">
      <Card title="Members" action={<button disabled className="text-xs text-muted cursor-not-allowed">+ Invite</button>}>
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 mb-4">
          <p className="text-sm text-foreground">Member management activates with Trishul IAM sign-in.</p>
          <p className="text-xs text-muted mt-0.5">Today the workspace runs as a single dev user. Once auth is wired, you can invite teammates and assign roles here.</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3">
          <div className="grid place-items-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-medium">D</div>
          <div>
            <p className="text-sm font-medium text-foreground">Dev User</p>
            <p className="text-xs text-muted">dev@trikal.local · Org Admin</p>
          </div>
        </div>
      </Card>

      <Card title="Roles">
        <div className="space-y-2">
          {ROLES.map((r) => (
            <div key={r.role} className="rounded-lg border border-border bg-surface-2/40 px-4 py-3">
              <p className="text-sm font-medium text-foreground">{r.role}</p>
              <p className="text-xs text-muted mt-0.5">{r.perms}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
