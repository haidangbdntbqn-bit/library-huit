import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { genCode } from "../../utils/code";
import { addDays, daysLate, endOfDay, startOfDay } from "../../utils/date";
import { badRequest, notFound } from "../../utils/http";
import { refreshCardExpiry } from "../cards/cards.routes";
import { getSettings } from "../settings/settings.service";
import { borrowBlockReason, calcReturnFine, renewBlockReason, renewedDueAt } from "../rules/rules";

/** Kiểm tra bạn đọc có đủ điều kiện mượn thêm `addCount` cuốn hay không */
export async function assertCanBorrow(readerId: number, addCount: number, loanType: "HOME" | "ONSITE" = "HOME") {
  const reader = await prisma.reader.findUnique({ where: { id: readerId }, include: { user: true } });
  if (!reader) throw notFound("Không tìm thấy bạn đọc");
  const card = await refreshCardExpiry(readerId);
  const s = await getSettings();
  const [unpaid, overdue, activeHome] = await Promise.all([
    prisma.violation.count({ where: { readerId, status: "UNPAID" } }),
    prisma.loanItem.count({ where: { returnedAt: null, dueAt: { lt: startOfDay(new Date()) }, loan: { readerId } } }),
    prisma.loanItem.count({ where: { returnedAt: null, loan: { readerId, loanType: "HOME" } } }),
  ]);
  const reason = borrowBlockReason(
    { userActive: reader.user.isActive, readerStatus: reader.status, cardStatus: card?.status, unpaid, overdue, activeHome, maxBooks: reader.maxBooks, addCount, loanType },
    s,
  );
  if (reason) throw badRequest(reason);
  return reader;
}

export interface CreateLoanInput {
  readerId: number;
  loanType: "HOME" | "ONSITE";
  barcodes: string[];
  dueAt?: Date;
  note?: string;
}

/** Lập phiếu mượn tại quầy */
export async function createLoan(input: CreateLoanInput, staffId?: number) {
  const barcodes = [...new Set(input.barcodes.map((b) => b.trim()).filter(Boolean))];
  if (!barcodes.length) throw badRequest("Chưa có sách trên phiếu");
  await assertCanBorrow(input.readerId, barcodes.length, input.loanType);

  const copies = await prisma.bookCopy.findMany({ where: { barcode: { in: barcodes } }, include: { book: true } });
  const missing = barcodes.filter((b) => !copies.some((c) => c.barcode === b));
  if (missing.length) throw badRequest(`Không tìm thấy mã vạch: ${missing.join(", ")}`);
  // Bản đang giữ (RESERVED) chỉ được mượn bởi đúng bạn đọc đã đặt trước
  const held = await prisma.borrowRequest.findMany({
    where: { readerId: input.readerId, status: "READY", copyId: { in: copies.map((c) => c.id) } },
    select: { copyId: true },
  });
  const heldIds = new Set(held.map((h) => h.copyId));
  const notAvailable = copies.filter((c) => c.status !== "AVAILABLE" && !(c.status === "RESERVED" && heldIds.has(c.id)));
  if (notAvailable.length) throw badRequest(`Bản sách không sẵn sàng: ${notAvailable.map((c) => c.barcode).join(", ")}`);
  if (input.loanType === "HOME") {
    const onsite = copies.filter((c) => c.onsiteOnly);
    if (onsite.length) throw badRequest(`Bản chỉ đọc tại chỗ, không mượn về nhà: ${onsite.map((c) => c.barcode).join(", ")}`);
  }

  const s = await getSettings();
  const now = new Date();
  const dueAt = input.loanType === "ONSITE" ? endOfDay(now) : endOfDay(input.dueAt ?? addDays(now, s.LOAN_DAYS));
  if (dueAt < now) throw badRequest("Hạn trả phải sau thời điểm hiện tại");

  return prisma.$transaction(async (tx) => {
    // Đảm bảo không ai mượn cùng lúc: chỉ cập nhật các bản còn AVAILABLE
    const updated = await tx.bookCopy.updateMany({
      where: { id: { in: copies.map((c) => c.id) }, status: { in: ["AVAILABLE", "RESERVED"] } },
      data: { status: "BORROWED" },
    });
    if (updated.count !== copies.length) throw badRequest("Có bản sách vừa được mượn bởi giao dịch khác, vui lòng thử lại");
    const loan = await tx.loan.create({
      data: {
        code: genCode("PM"),
        readerId: input.readerId,
        staffId,
        loanType: input.loanType,
        note: input.note,
        items: { create: copies.map((c) => ({ copyId: c.id, dueAt })) },
      },
      include: { items: { include: { copy: { include: { book: true } } } }, reader: { include: { user: { select: { fullName: true } } } } },
    });
    // Hoàn tất các yêu cầu mượn trực tuyến tương ứng; bản đã giữ cho yêu cầu khác (nếu có) được trả về kệ
    const others = await tx.borrowRequest.findMany({
      where: { readerId: input.readerId, bookId: { in: copies.map((c) => c.bookId) }, status: "READY", copyId: { notIn: copies.map((c) => c.id) } },
      select: { copyId: true },
    });
    const release = others.map((o) => o.copyId).filter((x): x is number => x !== null);
    if (release.length) await tx.bookCopy.updateMany({ where: { id: { in: release }, status: "RESERVED" }, data: { status: "AVAILABLE" } });
    await tx.borrowRequest.updateMany({
      where: { readerId: input.readerId, bookId: { in: copies.map((c) => c.bookId) }, status: { in: ["PENDING", "READY"] } },
      data: { status: "FULFILLED", handledAt: now },
    });
    return loan;
  });
}

/** Bạn đọc tự gia hạn một cuốn */
export async function renewItem(readerId: number, itemId: number) {
  const item = await prisma.loanItem.findUnique({ where: { id: itemId }, include: { loan: true, copy: true } });
  if (!item || item.loan.readerId !== readerId) throw notFound("Không tìm thấy sách đang mượn");
  const s = await getSettings();
  const [waiting, card] = await Promise.all([
    prisma.borrowRequest.count({ where: { bookId: item.copy.bookId, status: "PENDING", readerId: { not: readerId } } }),
    refreshCardExpiry(readerId),
  ]);
  const reason = renewBlockReason({ ...item, loanType: item.loan.loanType }, { now: new Date(), waitingOthers: waiting, cardStatus: card?.status }, s);
  if (reason) throw badRequest(reason);
  return prisma.loanItem.update({
    where: { id: itemId },
    data: { dueAt: renewedDueAt(item.dueAt, s), renewCount: { increment: 1 } },
    include: { copy: { include: { book: true } } },
  });
}

/** Xem trước thông tin trả sách theo mã vạch */
export async function lookupReturn(barcode: string) {
  const item = await prisma.loanItem.findFirst({
    where: { returnedAt: null, copy: { barcode } },
    include: {
      copy: { include: { book: true } },
      loan: { include: { reader: { include: { user: { select: { fullName: true } } } } } },
    },
  });
  if (!item) throw notFound(`Mã vạch ${barcode} không có trong phiếu mượn nào đang mở`);
  const s = await getSettings();
  const late = daysLate(item.dueAt);
  return { ...item, daysLate: late, estimatedFine: late * s.FINE_PER_DAY };
}

/** Tra cứu sách đang mượn của một bạn đọc (theo MSSV hoặc số thẻ) để chọn cuốn cần trả */
export async function openItemsOfReader(code: string) {
  const reader = await prisma.reader.findFirst({
    where: { OR: [{ studentCode: code }, { card: { cardNumber: code } }] },
    include: { user: { select: { fullName: true } }, major: true },
  });
  if (!reader) throw notFound("Không tìm thấy bạn đọc với mã này");
  const s = await getSettings();
  const items = await prisma.loanItem.findMany({
    where: { returnedAt: null, loan: { readerId: reader.id } },
    orderBy: { dueAt: "asc" },
    include: { copy: { include: { book: true } }, loan: true },
  });
  return {
    reader,
    items: items.map((i) => {
      const late = daysLate(i.dueAt);
      return { ...i, daysLate: late, estimatedFine: late * s.FINE_PER_DAY };
    }),
  };
}

export interface ReturnInput {
  barcode: string;
  condition: "GOOD" | "DAMAGED" | "LOST";
  note?: string;
}

/** Nhận trả sách: tính trễ hạn, ghi vi phạm, cập nhật trạng thái bản sách */
export async function returnItems(inputs: ReturnInput[]) {
  const s = await getSettings();
  const now = new Date();
  const results: Array<{ barcode: string; title: string; daysLate: number; fine: number; condition: string }> = [];

  await prisma.$transaction(async (tx) => {
    const loanIds = new Set<number>();
    for (const input of inputs) {
      const item = await tx.loanItem.findFirst({
        where: { returnedAt: null, copy: { barcode: input.barcode } },
        include: { copy: { include: { book: true } }, loan: true },
      });
      if (!item) throw badRequest(`Mã vạch ${input.barcode} không có trong phiếu mượn nào đang mở`);
      const { daysLate: late, lateFine, extraFine } = calcReturnFine(item.dueAt, now, input.condition as "GOOD" | "DAMAGED" | "LOST", s);
      const title = item.copy.book.title;

      await tx.loanItem.update({
        where: { id: item.id },
        data: { returnedAt: now, returnCondition: input.condition, fine: new Prisma.Decimal(lateFine + extraFine) },
      });
      await tx.bookCopy.update({
        where: { id: item.copyId },
        data: {
          status: input.condition === "GOOD" ? "AVAILABLE" : input.condition,
          condition: input.condition === "DAMAGED" ? input.note || "Hư hỏng khi trả" : undefined,
        },
      });
      if (late > 0) {
        await tx.violation.create({
          data: {
            readerId: item.loan.readerId,
            loanItemId: item.id,
            type: "LATE",
            description: `Trả trễ ${late} ngày: ${title}`,
            fineAmount: lateFine,
          },
        });
      }
      if (input.condition !== "GOOD") {
        await tx.violation.create({
          data: {
            readerId: item.loan.readerId,
            loanItemId: item.id,
            type: input.condition,
            description: `${input.condition === "LOST" ? "Làm mất" : "Làm hỏng"} sách: ${title}${input.note ? ` (${input.note})` : ""}`,
            fineAmount: extraFine,
          },
        });
      }
      loanIds.add(item.loanId);
      results.push({ barcode: input.barcode, title, daysLate: late, fine: lateFine + extraFine, condition: input.condition });
    }
    // Đóng phiếu khi tất cả sách đã trả
    for (const loanId of loanIds) {
      const remaining = await tx.loanItem.count({ where: { loanId, returnedAt: null } });
      if (remaining === 0) await tx.loan.update({ where: { id: loanId }, data: { status: "RETURNED" } });
    }
  });
  return results;
}

/** Gắn cờ quá hạn cho phiếu mượn khi trả về client */
export function withOverdue<T extends { items: Array<{ dueAt: Date; returnedAt: Date | null }> }>(loan: T) {
  const today = startOfDay(new Date());
  const open = loan.items.filter((i) => !i.returnedAt);
  return { ...loan, isOverdue: open.some((i) => i.dueAt < today), openItems: open.length };
}
