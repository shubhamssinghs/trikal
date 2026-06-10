import type { GridSpec } from "./artifact";

/** Build + download an .xlsx from a grid spec (lazy-loads SheetJS). */
export async function downloadSheetXlsx(spec: GridSpec, filename: string) {
  const XLSX = await import("xlsx");
  const aoa = [spec.columns, ...spec.rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Column widths from content length.
  ws["!cols"] = spec.columns.map((c, i) => {
    const maxCell = Math.max(c.length, ...spec.rows.map((r) => String(r[i] ?? "").length));
    return { wch: Math.min(48, Math.max(10, maxCell + 2)) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (spec.title || "Sheet").slice(0, 31));
  XLSX.writeFile(wb, filename);
}
