import { Router } from "express";
import { commission } from "../rules/rules";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { monthKey, startOfDay } from "../../utils/date";
import { asyncHandler, qint, qstr } from "../../utils/http";

/** Báo cáo thống kê */
const router = Router();
router.use(...staffOnly);

function monthsBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  while (d <= to) {
    keys.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
}

function range(query: Record<string, unknown>) {
  const to = qstr(query.to) ? new Date(String(query.to)) : new Date();
  const from = qstr(query.from) ? new Date(String(query.from)) : new Date(to.getFullYear(), to.getMonth() - 11, 1);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** Số liệu tổng quan cho dashboard */
router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [
      loansToday,
      homeToday,
      overdueItems,
      borrowingItems,
      titles,
      copies,
      readers,
      pendingCards,
      pendingRequests,
      pendingBookings,
      roomsInUse,
      rooms,
      unpaidViolations,
      revenue,
    ] = await Promise.all([
      prisma.loan.count({ where: { borrowedAt: { gte: today } } }),
      prisma.loan.count({ where: { borrowedAt: { gte: today }, loanType: "HOME" } }),
      prisma.loanItem.count({ where: { returnedAt: null, dueAt: { lt: today } } }),
      prisma.loanItem.count({ where: { returnedAt: null } }),
      prisma.book.count(),
      prisma.bookCopy.count({ where: { status: { notIn: ["LIQUIDATED", "LOST"] } } }),
      prisma.reader.count({ where: { status: "ACTIVE" } }),
      prisma.libraryCard.count({ where: { status: "LOCKED" } }),
      prisma.borrowRequest.count({ where: { status: "PENDING" } }),
      prisma.roomBooking.count({ where: { status: "PENDING" } }),
      prisma.roomBooking.count({ where: { status: "IN_USE" } }),
      prisma.room.count({ where: { status: "AVAILABLE", roomType: "GROUP" } }),
      prisma.violation.count({ where: { status: "UNPAID" } }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] }, paidAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
    ]);
    res.json({
      loansToday,
      homeToday,
      onsiteToday: loansToday - homeToday,
      overdueItems,
      borrowingItems,
      titles,
      copies,
      readers,
      lockedCards: pendingCards,
      pendingRequests,
      pendingBookings,
      roomsInUse,
      groupRooms: rooms,
      unpaidViolations,
      revenueThisMonth: Number(revenue._sum.totalAmount ?? 0),
    });
  }),
);

/** Mật độ sử dụng dịch vụ theo tháng: mượn sách, mượn phòng, mua tài liệu */
router.get(
  "/service-usage",
  asyncHandler(async (req, res) => {
    const { from, to } = range(req.query);
    const [loans, bookings, orders] = await Promise.all([
      prisma.loan.findMany({ where: { borrowedAt: { gte: from, lte: to } }, select: { borrowedAt: true, loanType: true } }),
      prisma.roomBooking.findMany({
        where: { startTime: { gte: from, lte: to }, status: { in: ["APPROVED", "IN_USE", "COMPLETED"] } },
        select: { startTime: true },
      }),
      prisma.order.findMany({ where: { createdAt: { gte: from, lte: to }, status: { not: "CANCELLED" } }, select: { createdAt: true } }),
    ]);
    const rows = monthsBetween(from, to).map((month) => ({ month, homeLoans: 0, onsiteLoans: 0, bookings: 0, orders: 0 }));
    const find = (d: Date) => rows.find((r) => r.month === monthKey(d));
    loans.forEach((l) => {
      const r = find(l.borrowedAt);
      if (r) l.loanType === "HOME" ? r.homeLoans++ : r.onsiteLoans++;
    });
    bookings.forEach((b) => {
      const r = find(b.startTime);
      if (r) r.bookings++;
    });
    orders.forEach((o) => {
      const r = find(o.createdAt);
      if (r) r.orders++;
    });
    res.json(rows);
  }),
);

/** Sách - giáo trình - TLTK theo ngành học */
router.get(
  "/books-by-major",
  asyncHandler(async (_req, res) => {
    const [majors, books, copyGroups] = await Promise.all([
      prisma.major.findMany({ orderBy: { name: "asc" } }),
      prisma.book.findMany({ select: { id: true, majorId: true, docType: true } }),
      prisma.bookCopy.groupBy({ by: ["bookId"], where: { status: { notIn: ["LIQUIDATED", "LOST"] } }, _count: { _all: true } }),
    ]);
    const copiesByBook = new Map(copyGroups.map((g) => [g.bookId, g._count._all]));
    const rows = [...majors.map((m) => ({ majorId: m.id as number | null, major: m.name })), { majorId: null, major: "Dùng chung" }].map(
      (m) => {
        const list = books.filter((b) => b.majorId === m.majorId);
        const sum = (type: string) => list.filter((b) => b.docType === type);
        return {
          ...m,
          giaoTrinhTitles: sum("GIAO_TRINH").length,
          tltkTitles: sum("TLTK").length,
          giaoTrinhCopies: sum("GIAO_TRINH").reduce((s, b) => s + (copiesByBook.get(b.id) ?? 0), 0),
          tltkCopies: sum("TLTK").reduce((s, b) => s + (copiesByBook.get(b.id) ?? 0), 0),
        };
      },
    );
    res.json(rows.filter((r) => r.giaoTrinhTitles + r.tltkTitles > 0 || r.majorId !== null));
  }),
);

/** Mức độ cập nhật mới hằng năm: số đầu sách mới và số bản nhập theo năm */
router.get(
  "/annual-updates",
  asyncHandler(async (_req, res) => {
    const [books, imports] = await Promise.all([
      prisma.book.findMany({ select: { createdAt: true } }),
      prisma.bookImport.findMany({ select: { importedAt: true, totalCost: true, _count: { select: { copies: true } } } }),
    ]);
    const map = new Map<number, { year: number; newTitles: number; importedCopies: number; importCost: number }>();
    const row = (year: number) => {
      if (!map.has(year)) map.set(year, { year, newTitles: 0, importedCopies: 0, importCost: 0 });
      return map.get(year)!;
    };
    books.forEach((b) => row(b.createdAt.getFullYear()).newTitles++);
    imports.forEach((i) => {
      const r = row(i.importedAt.getFullYear());
      r.importedCopies += i._count.copies;
      r.importCost += Number(i.totalCost);
    });
    res.json([...map.values()].sort((a, b) => a.year - b.year));
  }),
);

/** Doanh thu bán tài liệu và tiền phạt theo tháng trong năm */
router.get(
  "/revenue",
  asyncHandler(async (req, res) => {
    const year = qint(req.query.year) ?? new Date().getFullYear();
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59);
    const [orders, fines] = await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ["PAID", "COMPLETED"] }, paidAt: { gte: from, lte: to } },
        select: { paidAt: true, totalAmount: true },
      }),
      prisma.violation.findMany({
        where: { status: "PAID", resolvedAt: { gte: from, lte: to } },
        select: { resolvedAt: true, fineAmount: true },
      }),
    ]);
    const rows = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, sales: 0, fines: 0 }));
    orders.forEach((o) => (rows[o.paidAt!.getMonth()].sales += Number(o.totalAmount)));
    fines.forEach((f) => (rows[f.resolvedAt!.getMonth()].fines += Number(f.fineAmount)));
    res.json({ year, rows, totalSales: rows.reduce((s, r) => s + r.sales, 0), totalFines: rows.reduce((s, r) => s + r.fines, 0) });
  }),
);

/**
 * Thống kê theo khoa: khoa nào mượn sách, mượn phòng nhiều; doanh thu bán sách, tài liệu của khoa
 * và tiền hoa hồng chia cho khoa = doanh thu × tỉ lệ hoa hồng (cấu hình theo từng khoa).
 * GET /reports/by-faculty?from=&to=
 */
router.get(
  "/by-faculty",
  asyncHandler(async (req, res) => {
    const { from, to } = range(req.query);
    const [faculties, majors, readers, items, bookings, orderItems] = await Promise.all([
      prisma.faculty.findMany({ orderBy: { name: "asc" } }),
      prisma.major.findMany({ select: { id: true, facultyId: true } }),
      prisma.reader.findMany({ select: { id: true, majorId: true } }),
      prisma.loanItem.findMany({ where: { loan: { borrowedAt: { gte: from, lte: to } } }, select: { loan: { select: { readerId: true } } } }),
      prisma.roomBooking.findMany({
        where: { startTime: { gte: from, lte: to }, status: { in: ["APPROVED", "IN_USE", "COMPLETED"] } },
        select: { readerId: true, room: { select: { roomType: true } } },
      }),
      prisma.orderItem.findMany({
        where: { order: { status: { in: ["PAID", "COMPLETED"] }, paidAt: { gte: from, lte: to } } },
        select: { quantity: true, unitPrice: true, material: { select: { majorId: true, category: true } } },
      }),
    ]);
    const facultyOfMajor = new Map(majors.map((m) => [m.id, m.facultyId]));
    const facultyOfReader = new Map(readers.map((r) => [r.id, r.majorId ? facultyOfMajor.get(r.majorId) ?? null : null]));
    type Row = { facultyId: number | null; code: string; faculty: string; rate: number; readers: number; loans: number; groupBookings: number;
      readingBookings: number; materialSales: number; bookSales: number; revenue: number; commission: number };
    const rows = new Map<number | null, Row>();
    const row = (id: number | null) => {
      if (!rows.has(id)) {
        const f = faculties.find((x) => x.id === id);
        rows.set(id, { facultyId: id, code: f?.code ?? "KHAC", faculty: f?.name ?? "Khác / dùng chung", rate: f ? Number(f.commissionRate) : 0,
          readers: 0, loans: 0, groupBookings: 0, readingBookings: 0, materialSales: 0, bookSales: 0, revenue: 0, commission: 0 });
      }
      return rows.get(id)!;
    };
    faculties.forEach((f) => row(f.id));
    readers.forEach((r) => row(facultyOfReader.get(r.id) ?? null).readers++);
    items.forEach((i) => row(facultyOfReader.get(i.loan.readerId) ?? null).loans++);
    bookings.forEach((b) => {
      const r = row(facultyOfReader.get(b.readerId) ?? null);
      if (b.room.roomType === "GROUP") r.groupBookings++;
      else r.readingBookings++;
    });
    orderItems.forEach((o) => {
      const r = row(o.material.majorId ? facultyOfMajor.get(o.material.majorId) ?? null : null);
      const amount = Number(o.unitPrice) * o.quantity;
      if (o.material.category === "BAI_GIANG") r.materialSales += amount;
      else r.bookSales += amount;
      r.revenue += amount;
    });
    const result = [...rows.values()].map((r) => ({ ...r, commission: commission(r.revenue, r.rate) }));
    res.json(result.filter((r) => r.facultyId !== null || r.readers + r.loans + r.revenue > 0).sort((a, b) => b.loans - a.loans));
  }),
);

/** Đầu sách được mượn nhiều nhất */
router.get(
  "/top-books",
  asyncHandler(async (req, res) => {
    const { from, to } = range(req.query);
    const limit = qint(req.query.limit) ?? 10;
    const items = await prisma.loanItem.findMany({
      where: { loan: { borrowedAt: { gte: from, lte: to } } },
      select: { copy: { select: { book: { select: { id: true, title: true, code: true } } } } },
    });
    const counts = new Map<number, { id: number; title: string; code: string; loans: number }>();
    items.forEach(({ copy: { book } }) => {
      const r = counts.get(book.id) ?? { ...book, loans: 0 };
      r.loans++;
      counts.set(book.id, r);
    });
    res.json([...counts.values()].sort((a, b) => b.loans - a.loans).slice(0, limit));
  }),
);

export default router;
