export type Role = "org_admin" | "project_manager" | "member" | "viewer";

export const RolePermissions: Record<Role, string[]> = {
  org_admin: ["*"],
  project_manager: [
    "company:read",
    "company:write",
    "project:read",
    "project:write",
    "transcript:write",
    "recommendation:approve",
    "diagram:write",
  ],
  member: [
    "company:read",
    "project:read",
    "transcript:write",
    "diagram:read",
  ],
  viewer: [
    "company:read",
    "project:read",
    "diagram:read",
  ],
};

export function hasPermission(role: Role, permission: string): boolean {
  const perms = RolePermissions[role];
  return perms.includes("*") || perms.includes(permission);
}
