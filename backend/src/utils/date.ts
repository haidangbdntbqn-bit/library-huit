const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Số ngày trễ tính theo ngày lịch (trả trong ngày hết hạn = không trễ) */
export function daysLate(dueAt: Date, at: Date = new Date()): number {
  const diff = startOfDay(at).getTime() - startOfDay(dueAt).getTime();
  return diff > 0 ? Math.round(diff / DAY) : 0;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
