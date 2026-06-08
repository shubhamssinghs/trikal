import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

const MAX_WIDTHS: Record<string, string> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
};

export function Shell({
  active,
  width = "xl",
  children,
}: {
  active?: string;
  width?: keyof typeof MAX_WIDTHS;
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      {/* Fixed sidebar */}
      <Sidebar active={active} />

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-14 shrink-0 border-b border-border bg-surface/70 backdrop-blur flex items-center justify-end gap-3 px-6">
          <ThemeToggle />
        </header>

        {/* Scrollable main */}
        <main className="flex-1 overflow-y-auto">
          <div className={`${MAX_WIDTHS[width]} w-full mx-auto px-8 py-8`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
