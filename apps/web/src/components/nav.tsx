import Link from "next/link";
import { LayoutDashboard, Building2, FolderKanban, Settings } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
];

export function Nav({ active }: { active?: string }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
      <div className="px-6 h-14 flex items-center gap-1">
        <Link href="/" className="flex items-center gap-2 mr-4">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-blue-600 text-white text-sm font-bold">T</span>
          <span className="font-semibold text-foreground">Trikal</span>
        </Link>

        {LINKS.map((l) => {
          const Icon = l.icon;
          const isActive = active === l.href;
          return (
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface-2/60"
              }`}>
              <Icon size={15} />
              {l.label}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/settings"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              active === "/settings"
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground hover:bg-surface-2/60"
            }`}>
            <Settings size={15} />
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}
