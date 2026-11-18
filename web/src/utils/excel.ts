/**
 * Xuất báo cáo thống kê ra file Excel nhiều trang tính (thư viện SheetJS "xlsx", tải khi bấm nút).
 */
export type Sheet = { name: string; rows: Array<Record<string, string | number>> ; widths?: number[] };

export async function exportExcel(fileName: string, sheets: Sheet[], title?: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
        const ws = XLSX.utils.aoa_to_sheet(title ? [[title], [sh.name]] : []);
    XLSX.utils.sheet_add_json(ws, sh.rows, { origin: title ? "A3" : "A1" });
    const cols = Object.keys(sh.rows[0] ?? {});
    ws["!cols"] = cols.map((c, i) => ({ wch: sh.widths?.[i] ?? Math.max(12, c.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName);
}
