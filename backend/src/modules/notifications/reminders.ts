import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { addDays, daysLate, endOfDay, startOfDay } from "../../utils/date";
import { getSettings } from "../settings/settings.service";

/** Có SMTP thì gửi thật; không có thì dùng jsonTransport (chỉ dựng thư, không gửi) và ghi log */
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface ReminderResult {
  smtp: boolean;
  readers: number;
  emails: Array<{ to: string | null; name: string; subject: string; items: number; sent: boolean; skipped?: string }>;
}

/**
 * Gửi email nhắc cho bạn đọc có sách sắp đến hạn (trong REMIND_DAYS ngày) hoặc đã quá hạn.
 * Mỗi bạn đọc nhận tối đa 1 email mỗi ngày (bảng NotificationLog chống gửi trùng).
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderResult> {
  const s = await getSettings();
  const items = await prisma.loanItem.findMany({
    where: { returnedAt: null, loan: { loanType: "HOME" }, dueAt: { lte: endOfDay(addDays(now, s.REMIND_DAYS)) } },
    include: { copy: { include: { book: { select: { title: true } } } }, loan: { include: { reader: { include: { user: true } } } } },
    orderBy: { dueAt: "asc" },
  });
  const byReader = new Map<number, typeof items>();
  items.forEach((i) => byReader.set(i.loan.readerId, [...(byReader.get(i.loan.readerId) ?? []), i]));

  const result: ReminderResult = { smtp: !!env.SMTP_HOST, readers: byReader.size, emails: [] };
  for (const [readerId, list] of byReader) {
    const user = list[0].loan.reader.user;
    const overdue = list.filter((i) => daysLate(i.dueAt, now) > 0);
    const subject = overdue.length
      ? `[Thư viện HUIT] Bạn có ${overdue.length} cuốn sách quá hạn`
      : `[Thư viện HUIT] Nhắc hạn trả ${list.length} cuốn sách`;
    const refKey = `due:${readerId}:${dayKey(now)}`;
    const existed = await prisma.notificationLog.findUnique({ where: { refKey_channel: { refKey, channel: "EMAIL" } } });
    if (existed) {
      result.emails.push({ to: user.email, name: user.fullName, subject, items: list.length, sent: existed.sent, skipped: "Đã nhắc hôm nay" });
      continue;
    }
    if (!user.email) {
      result.emails.push({ to: null, name: user.fullName, subject, items: list.length, sent: false, skipped: "Chưa có email" });
      continue;
    }
    const rows = list
      .map((i) => {
        const late = daysLate(i.dueAt, now);
        const left = Math.round((startOfDay(i.dueAt).getTime() - startOfDay(now).getTime()) / 86400000);
        const state = late > 0 ? `<b style="color:#B3261E">Quá hạn ${late} ngày – phạt tạm tính ${(late * s.FINE_PER_DAY).toLocaleString("vi-VN")} đ</b>` : left === 0 ? "<b>Hết hạn hôm nay</b>" : `Còn ${left} ngày`;
        return `<tr><td style="padding:6px 8px;border-bottom:1px solid #DCE3EC">${esc(i.copy.book.title)}</td><td style="padding:6px 8px;border-bottom:1px solid #DCE3EC">${fmt(i.dueAt)}</td><td style="padding:6px 8px;border-bottom:1px solid #DCE3EC">${state}</td></tr>`;
      })
      .join("");
    const html = `<div style="font-family:Arial,sans-serif;color:#14213D;max-width:560px">
      <div style="background:#0B4DA2;color:#fff;padding:14px 18px;font-size:18px;font-weight:bold">Thư viện HUIT – Nhắc hạn trả sách</div>
      <p>Chào ${esc(user.fullName)},</p>
      <p>Bạn đang mượn các cuốn sách sau sắp đến hạn hoặc đã quá hạn:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#EAF1FB"><th align="left" style="padding:6px 8px">Tên sách</th><th align="left" style="padding:6px 8px">Hạn trả</th><th align="left" style="padding:6px 8px">Tình trạng</th></tr>${rows}</table>
      <p>Sách chưa quá hạn có thể <b>gia hạn thêm ${s.RENEW_DAYS} ngày</b> tại mục <a href="${env.WEB_URL}/my-loans">Sách của tôi</a>. Trả trễ bị phạt ${s.FINE_PER_DAY.toLocaleString("vi-VN")} đ/ngày/cuốn.</p>
      <p style="color:#4B5874;font-size:12px">Email tự động từ hệ thống quản lý thư viện, vui lòng không trả lời.</p></div>`;
    let sent = false;
    try {
      await transporter.sendMail({ from: env.MAIL_FROM, to: user.email, subject, html });
      sent = !!env.SMTP_HOST;
    } catch (e) {
      console.error("Gửi email nhắc thất bại:", user.email, (e as Error).message);
    }
    await prisma.notificationLog.create({ data: { readerId, kind: overdue.length ? "OVERDUE" : "DUE_SOON", refKey, toAddress: user.email, subject, sent } });
    result.emails.push({ to: user.email, name: user.fullName, subject, items: list.length, sent });
  }
  return result;
}

/** Lịch chạy: kiểm tra 15 phút/lần, gửi một lần mỗi ngày sau REMINDER_HOUR giờ */
export function startReminderScheduler() {
  let lastDay = "";
  const tick = () => {
    const now = new Date();
    if (now.getHours() < env.REMINDER_HOUR || dayKey(now) === lastDay) return;
    lastDay = dayKey(now);
    sendDueReminders(now)
      .then((r) => console.log(`Đã xử lý email nhắc hạn trả cho ${r.readers} bạn đọc${r.smtp ? "" : " (chưa cấu hình SMTP: chỉ ghi log)"}`))
      .catch((e) => console.error("Lỗi gửi email nhắc:", e));
  };
  setTimeout(tick, 10_000);
  setInterval(tick, 15 * 60_000);
}
