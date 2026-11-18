import { Router } from "express";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { sendDueReminders } from "./reminders";
import { addDays, daysLate, endOfDay, startOfDay } from "../../utils/date";
import { asyncHandler } from "../../utils/http";
import { getSettings } from "../settings/settings.service";

/**
 * Nhắc nhở bạn đọc (hiển thị ở chuông thông báo trên web và đầu màn hình app):
 * sách sắp đến hạn / quá hạn, sách đã soạn chờ nhận, lịch phòng sắp tới, tiền phạt chưa nộp, đơn hàng chờ nhận.
 * Được tính trực tiếp từ dữ liệu nên luôn đúng tình trạng hiện tại.
 */
const router = Router();

export interface Notice {
  key: string;
  level: "danger" | "warning" | "info" | "success";
  title: string;
  message: string;
  link: string;
  at: Date;
}

const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const hm = (d: Date) => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, "0") : ""}`;

export async function noticesFor(readerId: number): Promise<Notice[]> {
  const s = await getSettings();
  const now = new Date();
  const out: Notice[] = [];
  const [items, ready, bookings, rejected, unpaid, orders] = await Promise.all([
    prisma.loanItem.findMany({
      where: { returnedAt: null, loan: { readerId }, dueAt: { lte: endOfDay(addDays(now, s.REMIND_DAYS)) } },
      include: { copy: { include: { book: { select: { title: true } } } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.borrowRequest.findMany({ where: { readerId, status: "READY" }, include: { book: { select: { title: true } } } }),
    prisma.roomBooking.findMany({
      where: { readerId, status: { in: ["APPROVED", "PENDING"] }, startTime: { gte: now, lte: endOfDay(addDays(now, 1)) } },
      include: { room: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.roomBooking.findMany({
      where: { readerId, status: "REJECTED", createdAt: { gte: addDays(now, -7) } },
      include: { room: { select: { name: true } } },
    }),
    prisma.violation.aggregate({ where: { readerId, status: "UNPAID" }, _sum: { fineAmount: true }, _count: true }),
    prisma.order.findMany({ where: { readerId, status: "PAID" } }),
  ]);
  for (const i of items) {
    const late = daysLate(i.dueAt, now);
    const left = Math.round((startOfDay(i.dueAt).getTime() - startOfDay(now).getTime()) / 86400000);
    if (late > 0) {
      out.push({ key: `late-${i.id}`, level: "danger", title: "Sách quá hạn", link: "/my-loans", at: i.dueAt,
        message: `"${i.copy.book.title}" đã quá hạn ${late} ngày (hạn ${fmt(i.dueAt)}). Tiền phạt tạm tính ${(late * s.FINE_PER_DAY).toLocaleString("vi-VN")} đ, vui lòng trả sớm.` });
    } else {
      out.push({ key: `due-${i.id}`, level: "warning", title: left === 0 ? "Hôm nay hết hạn trả sách" : `Còn ${left} ngày đến hạn trả`, link: "/my-loans", at: i.dueAt,
        message: `"${i.copy.book.title}" cần trả trước ngày ${fmt(i.dueAt)}.${i.renewCount < s.MAX_RENEWALS ? ` Bạn có thể gia hạn thêm ${s.RENEW_DAYS} ngày.` : ""}` });
    }
  }
  for (const r of ready) {
    out.push({ key: `ready-${r.id}`, level: "success", title: "Sách đã sẵn sàng", link: "/my-loans?tab=requests", at: r.handledAt ?? r.createdAt,
      message: `"${r.book.title}" đã được soạn, mời bạn đến quầy nhận${r.pickupBefore ? ` trước ngày ${fmt(r.pickupBefore)}` : ""}.` });
  }
  for (const b of bookings) {
    out.push({ key: `room-${b.id}`, level: "info", title: b.status === "APPROVED" ? "Lịch mượn phòng sắp tới" : "Lượt đặt phòng chờ duyệt", link: "/rooms", at: b.startTime,
      message: `${b.room.name}, ${hm(b.startTime)}–${hm(b.endTime)} ngày ${fmt(b.startTime)}.` });
  }
  for (const b of rejected) {
    out.push({ key: `rej-${b.id}`, level: "danger", title: "Lượt đặt phòng bị từ chối", link: "/rooms", at: b.createdAt,
      message: `${b.room.name}, ${hm(b.startTime)} ngày ${fmt(b.startTime)}${b.note ? `: ${b.note}` : ""}.` });
  }
  if (unpaid._count) {
    out.push({ key: "fine", level: "danger", title: "Còn tiền phạt chưa nộp", link: "/account", at: now,
      message: `${unpaid._count} vi phạm, tổng ${Number(unpaid._sum.fineAmount ?? 0).toLocaleString("vi-VN")} đ. Vui lòng nộp tại quầy để tiếp tục mượn sách.` });
  }
  for (const o of orders) {
    out.push({ key: `order-${o.id}`, level: "success", title: "Đơn hàng chờ nhận", link: "/store", at: o.paidAt ?? o.createdAt,
      message: `Đơn ${o.code} đã thanh toán, mời bạn nhận tài liệu tại quầy phát hành.` });
  }
  const rank = { danger: 0, warning: 1, success: 2, info: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    res.json(await noticesFor(currentReaderId(req)));
  }),
);

/** Thủ thư gửi email nhắc hạn trả ngay (không chờ lịch hằng ngày) */
router.post(
  "/send-reminders",
  ...staffOnly,
  asyncHandler(async (_req, res) => {
    res.json(await sendDueReminders());
  }),
);

/** Lịch sử email nhắc đã gửi */
router.get(
  "/logs",
  ...staffOnly,
  asyncHandler(async (_req, res) => {
    res.json(await prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  }),
);

export default router;
