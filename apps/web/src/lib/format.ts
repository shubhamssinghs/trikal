export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  // Force UTC so server (Docker) and browser produce identical output
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
