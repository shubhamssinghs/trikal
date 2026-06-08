import { Sidebar } from "./sidebar";

const MAX_WIDTHS: Record<string, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
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
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar active={active} />
      <div className="flex-1 min-w-0">
        <main className={`${MAX_WIDTHS[width]} w-full mx-auto px-6 py-6`}>{children}</main>
      </div>
    </div>
  );
}
