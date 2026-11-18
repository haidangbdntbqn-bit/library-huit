/** Sinh mã chứng từ dạng PREFIX-YYMMDD-XXXX, ví dụ PM-260923-A1B2 */
export function genCode(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
  return `${prefix}-${ymd}-${rnd}`;
}
