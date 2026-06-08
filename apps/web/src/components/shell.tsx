import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

const MAX_WIDTHS: Record<string, string> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-none",
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
      <Sidebar active={active} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          <div className={`${MAX_WIDTHS[width]} w-full mx-auto px-8 pb-8 pt-4`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
