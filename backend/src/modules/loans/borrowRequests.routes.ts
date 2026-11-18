import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { LOAN_TYPES } from "../../utils/constants";
import { addDays, endOfDay } from "../../utils/date";
import { asyncHandler, badRequest, conflict, notFound, paged, paging, parseId, qstr } from "../../utils/http";
import { summarizeCopies } from "../books/books.service";
import { getSettings } from "../settings/settings.service";
import { assertCanBorrow } from "./loans.service";

/**
 * Tìm và mượn sách trực tuyến:
 * 1. Bạn đọc đặt mượn, chọn hình thức (về nhà / đọc tại chỗ)            -> PENDING
 * 2. Thủ thư soạn sách: hệ thống giữ một bản sách cho bạn đọc (RESERVED) -> READY
 * 3. Bạn đọc đến quầy, thủ thư bấm "Lập phiếu mượn": phiếu được điền sẵn
 *    bạn đọc, mã vạch bản đã giữ, hình thức mượn, hạn trả                 -> FULFILLED
 */
const router = Router();

const include = {
  book: { select: { id: true, code: true, title: true, author: true, shelf: true } },
  copy: { select: { id: true, barcode: true, status: true } },
  reader: { include: { user: { select: { fullName: true } } } },
};

/** Trả bản sách đang giữ về kệ */
async function releaseCopy(copyId: number | null) {
  if (copyId) await prisma.bookCopy.updateMany({ where: { id: copyId, status: "RESERVED" }, data: { status: "AVAILABLE" } });
}

/** Tự hủy các yêu cầu đã soạn sách nhưng quá hạn đến nhận */
async function expireOverdue() {
  const expired = await prisma.borrowRequest.findMany({ where: { status: "READY", pickupBefore: { lt: new Date() } } });
  for (const r of expired) {
    await releaseCopy(r.copyId);
    await prisma.borrowRequest.update({ where: { id: r.id }, data: { status: "CANCELLED", note: "Quá hạn đến nhận sách", handledAt: new Date() } });
  }
}

router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    await expireOverdue();
    res.json(await prisma.borrowRequest.findMany({ where: { readerId: currentReaderId(req) }, orderBy: { createdAt: "desc" }, include }));
  }),
);

router.post(
  "/",
  ...readerOnly,
  validate(z.object({ bookId: z.number().int().positive(), loanType: z.enum(LOAN_TYPES).default("HOME") })),
  asyncHandler(async (req, res) => {
    const readerId = currentReaderId(req);
    const { bookId, loanType } = req.body as { bookId: number; loanType: "HOME" | "ONSITE" };
    const summary = (await summarizeCopies([bookId])).get(bookId);
    if (!summary || summary.total === 0) throw notFound("Không tìm thấy đầu sách");
    const free = loanType === "HOME" ? summary.available : summary.available + summary.onsiteAvailable;
    if (free === 0) {
      throw badRequest(loanType === "HOME" ? "Đầu sách hiện không còn bản để mượn về nhà" : "Đầu sách hiện không còn bản để đọc tại chỗ");
    }
    const dup = await prisma.borrowRequest.count({ where: { readerId, bookId, status: { in: ["PENDING", "READY"] } } });
    if (dup) throw conflict("Bạn đã đặt mượn đầu sách này rồi");
    const pending = await prisma.borrowRequest.count({ where: { readerId, status: { in: ["PENDING", "READY"] }, loanType: "HOME" } });
    await assertCanBorrow(readerId, loanType === "HOME" ? pending + 1 : 1, loanType);
    res.status(201).json(await prisma.borrowRequest.create({ data: { readerId, bookId, loanType }, include }));
  }),
);

router.patch(
  "/:id/cancel",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    const r = await prisma.borrowRequest.findUnique({ where: { id: parseId(req.params.id) } });
    if (!r || r.readerId !== currentReaderId(req)) throw notFound();
    if (!["PENDING", "READY"].includes(r.status)) throw badRequest("Yêu cầu đã được xử lý");
    await releaseCopy(r.copyId);
    res.json(await prisma.borrowRequest.update({ where: { id: r.id }, data: { status: "CANCELLED", handledAt: new Date() }, include }));
  }),
);

// ----- Thủ thư -----

router.get(
  "/",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    await expireOverdue();
    const { page, pageSize, skip, take } = paging(req.query);
    const status = qstr(req.query.status);
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      prisma.borrowRequest.findMany({ where, skip, take, orderBy: { createdAt: "asc" }, include }),
      prisma.borrowRequest.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

/**
 * Dữ liệu điền sẵn cho phiếu mượn từ các yêu cầu đã soạn sách của một bạn đọc:
 * GET /borrow-requests/pickup?code=MSSV -> { loanType, dueAt, barcodes, requests }
 */
router.get(
  "/pickup",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const code = qstr(req.query.code);
    if (!code) throw badRequest("Thiếu MSSV");
    await expireOverdue();
    const requests = await prisma.borrowRequest.findMany({
      where: { status: "READY", reader: { OR: [{ studentCode: code }, { card: { cardNumber: code } }] } },
      orderBy: { createdAt: "asc" },
      include,
    });
    const s = await getSettings();
    const loanType = requests.some((r) => r.loanType === "HOME") || !requests.length ? "HOME" : "ONSITE";
    const list = requests.filter((r) => r.loanType === loanType && r.copy);
    res.json({
      loanType,
      dueAt: loanType === "HOME" ? endOfDay(addDays(new Date(), s.LOAN_DAYS)) : endOfDay(new Date()),
      barcodes: list.map((r) => r.copy!.barcode),
      requests,
    });
  }),
);

/** Thủ thư soạn sách: hệ thống chọn và giữ một bản phù hợp hình thức mượn */
router.patch(
  "/:id/ready",
  ...staffOnly,
  validate(z.object({ barcode: z.string().trim().optional() }).default({})),
  asyncHandler(async (req, res) => {
    const r = await prisma.borrowRequest.findUniqueOrThrow({ where: { id: parseId(req.params.id) } });
    if (r.status !== "PENDING") throw badRequest("Chỉ xử lý được yêu cầu đang chờ");
    const wanted = req.body?.barcode as string | undefined;
    const candidates = await prisma.bookCopy.findMany({
      where: {
        bookId: r.bookId,
        status: "AVAILABLE",
        ...(wanted ? { barcode: wanted } : {}),
        ...(r.loanType === "HOME" ? { onsiteOnly: false } : {}),
      },
      orderBy: [{ onsiteOnly: r.loanType === "ONSITE" ? "desc" : "asc" }, { barcode: "asc" }],
      take: 1,
    });
    const copy = candidates[0];
    if (!copy) throw badRequest(wanted ? `Bản ${wanted} không sẵn sàng hoặc không đúng đầu sách` : "Đầu sách hiện không còn bản phù hợp để soạn");
    const s = await getSettings();
    const updated = await prisma.$transaction(async (tx) => {
      const held = await tx.bookCopy.updateMany({ where: { id: copy.id, status: "AVAILABLE" }, data: { status: "RESERVED" } });
      if (held.count === 0) throw badRequest("Bản sách vừa được dùng cho giao dịch khác, vui lòng thử lại");
      return tx.borrowRequest.update({
        where: { id: r.id },
        data: { status: "READY", copyId: copy.id, pickupBefore: endOfDay(addDays(new Date(), s.PICKUP_DAYS)), handledAt: new Date() },
        include,
      });
    });
    res.json(updated);
  }),
);

router.patch(
  "/:id/reject",
  ...staffOnly,
  validate(z.object({ note: z.string().trim().max(300).optional() })),
  asyncHandler(async (req, res) => {
    const r = await prisma.borrowRequest.findUniqueOrThrow({ where: { id: parseId(req.params.id) } });
    if (!["PENDING", "READY"].includes(r.status)) throw badRequest("Yêu cầu đã được xử lý");
    await releaseCopy(r.copyId);
    res.json(
      await prisma.borrowRequest.update({ where: { id: r.id }, data: { status: "REJECTED", note: req.body.note, handledAt: new Date() }, include }),
    );
  }),
);

export default router;
