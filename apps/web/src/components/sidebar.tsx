import Link from "next/link";
import { LayoutDashboard, Building2, FolderKanban, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function Sidebar({ active }: { active?: string }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2 px-5 border-b border-border">
        <span className="grid place-items-center w-7 h-7 rounded-md bg-blue-600 text-white text-sm font-bold">T</span>
        <span className="font-semibold text-foreground">Trikal</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted">Workspace</p>
        {LINKS.map((l) => {
          const Icon = l.icon;
          const isActive = active === l.href;
          return (
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/10 text-blue-500 font-medium"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}>
              <Icon size={16} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-1">
        <Link href="/settings"
          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
            active === "/settings"
              ? "bg-blue-600/10 text-blue-500 font-medium"
              : "text-muted hover:text-foreground hover:bg-surface-2"
          }`}>
          <Settings size={16} />
          Settings
        </Link>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
