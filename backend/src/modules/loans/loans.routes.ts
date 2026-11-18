import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { LOAN_TYPES } from "../../utils/constants";
import { startOfDay } from "../../utils/date";
import { asyncHandler, notFound, paged, paging, parseId, qstr } from "../../utils/http";
import { createLoan, renewItem, withOverdue } from "./loans.service";

const router = Router();

const loanInclude = {
  reader: { include: { user: { select: { fullName: true } } } },
  staff: { include: { user: { select: { fullName: true } } } },
  items: { include: { copy: { include: { book: { select: { id: true, code: true, title: true, author: true } } } } } },
} satisfies Prisma.LoanInclude;

// ----- Bạn đọc -----

/** Lịch sử mượn sách của tôi */
router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    const readerId = currentReaderId(req);
    const status = qstr(req.query.status);
    const loans = await prisma.loan.findMany({
      where: { readerId, ...(status ? { status } : {}) },
      orderBy: { borrowedAt: "desc" },
      include: loanInclude,
    });
    res.json(loans.map(withOverdue));
  }),
);

router.post(
  "/items/:itemId/renew",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    res.json(await renewItem(currentReaderId(req), parseId(req.params.itemId)));
  }),
);

// ----- Thủ thư -----

router.get(
  "/",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const q = qstr(req.query.q);
    const status = qstr(req.query.status); // BORROWING | RETURNED | OVERDUE
    const loanType = qstr(req.query.loanType);
    const where: Prisma.LoanWhereInput = {
      ...(loanType ? { loanType } : {}),
      ...(status === "OVERDUE"
        ? { status: "BORROWING", items: { some: { returnedAt: null, dueAt: { lt: startOfDay(new Date()) } } } }
        : status
          ? { status }
          : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { reader: { studentCode: { contains: q } } },
              { reader: { user: { fullName: { contains: q } } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({ where, skip, take, orderBy: { borrowedAt: "desc" }, include: loanInclude }),
      prisma.loan.count({ where }),
    ]);
    res.json(paged(items.map(withOverdue), total, page, pageSize));
  }),
);

router.get(
  "/:id",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const loan = await prisma.loan.findUnique({ where: { id: parseId(req.params.id) }, include: loanInclude });
    if (!loan) throw notFound("Không tìm thấy phiếu mượn");
    res.json(withOverdue(loan));
  }),
);

const createSchema = z.object({
  readerId: z.number().int().positive(),
  loanType: z.enum(LOAN_TYPES),
  barcodes: z.array(z.string()).min(1, "Chưa có sách trên phiếu"),
  dueAt: z.coerce.date().optional(),
  note: z.string().trim().max(300).optional(),
});

router.post(
  "/",
  ...staffOnly,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const loan = await createLoan(req.body, req.user!.staffId);
    res.status(201).json(withOverdue(loan));
  }),
);

export default router;
