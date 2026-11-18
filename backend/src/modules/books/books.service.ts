import { prisma } from "../../config/prisma";

export interface CopySummary {
  total: number; // không tính bản đã thanh lý / mất
  available: number; // có thể mượn về nhà
  onsiteAvailable: number; // chỉ đọc tại chỗ, đang rảnh
  borrowed: number;
  reserved: number; // đang giữ cho bạn đọc đặt trước
}

/** Tính số bản theo trạng thái cho danh sách đầu sách */
export async function summarizeCopies(bookIds: number[]): Promise<Map<number, CopySummary>> {
  const map = new Map<number, CopySummary>();
  bookIds.forEach((id) => map.set(id, { total: 0, available: 0, onsiteAvailable: 0, borrowed: 0, reserved: 0 }));
  if (!bookIds.length) return map;
  const groups = await prisma.bookCopy.groupBy({
    by: ["bookId", "status", "onsiteOnly"],
    where: { bookId: { in: bookIds } },
    _count: { _all: true },
  });
  for (const g of groups) {
    const s = map.get(g.bookId)!;
    const n = g._count._all;
    if (g.status === "LIQUIDATED" || g.status === "LOST") continue;
    s.total += n;
    if (g.status === "AVAILABLE" && !g.onsiteOnly) s.available += n;
    if (g.status === "AVAILABLE" && g.onsiteOnly) s.onsiteAvailable += n;
    if (g.status === "BORROWED") s.borrowed += n;
    if (g.status === "RESERVED") s.reserved += n;
  }
  return map;
}
