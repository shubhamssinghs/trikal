import Link from "next/link";
import { LayoutDashboard, Building2, FolderKanban, Settings } from "lucide-react";
import { TrikalLogo } from "./trikal-logo";

const LINKS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function Sidebar({ active }: { active?: string }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface h-screen">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm">
          <TrikalLogo className="w-5 text-white" />
        </span>
        <div className="leading-tight">
          <p className="font-semibold text-foreground text-[15px]">Trikal</p>
          <p className="text-[10px] text-muted -mt-0.5">Command Center</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Workspace</p>
        {LINKS.map((l) => {
          const Icon = l.icon;
          const isActive = active === l.href;
          return (
            <Link key={l.href} href={l.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/10 text-blue-500 font-medium"
                  : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}>
              <Icon size={17} className={isActive ? "" : "opacity-80"} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 shrink-0">
        <Link href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            active === "/settings"
              ? "bg-blue-600/10 text-blue-500 font-medium"
              : "text-muted hover:text-foreground hover:bg-surface-2"
          }`}>
          <Settings size={17} className="opacity-80" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
