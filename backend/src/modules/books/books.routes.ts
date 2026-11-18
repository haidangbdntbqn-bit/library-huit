import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { DOC_TYPES } from "../../utils/constants";
import { asyncHandler, notFound, paged, paging, parseId, qint, qstr } from "../../utils/http";
import { summarizeCopies } from "./books.service";

/** Sách, giáo trình, tài liệu tham khảo: tra cứu công khai và quản lý */
const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const q = qstr(req.query.q);
    const majorId = qint(req.query.majorId);
    const docType = qstr(req.query.docType);
    const available = req.query.available === "true";
    const sort = qstr(req.query.sort) ?? "newest";
    const where: Prisma.BookWhereInput = {
      ...(majorId ? { majorId } : {}),
      ...(docType ? { docType } : {}),
      ...(available ? { copies: { some: { status: "AVAILABLE" } } } : {}),
      ...(q
        ? { OR: [{ title: { contains: q } }, { author: { contains: q } }, { code: { contains: q } }, { isbn: { contains: q } }] }
        : {}),
    };
    const orderBy: Prisma.BookOrderByWithRelationInput =
      sort === "title" ? { title: "asc" } : sort === "year" ? { publishYear: "desc" } : { createdAt: "desc" };
    let books: Prisma.BookGetPayload<{ include: { major: true } }>[];
    let total: number;
    if (sort === "popular") {
      // Mượn nhiều nhất (12 tháng gần nhất): dùng cho gợi ý sách và chatbot
      const all = await prisma.book.findMany({ where, include: { major: true } });
      const since = new Date(Date.now() - 365 * 86400000);
      const grouped = await prisma.loanItem.groupBy({
        by: ["copyId"],
        where: { copy: { bookId: { in: all.map((b) => b.id) } }, loan: { borrowedAt: { gte: since } } },
        _count: { _all: true },
      });
      const copies = await prisma.bookCopy.findMany({ where: { id: { in: grouped.map((g) => g.copyId) } }, select: { id: true, bookId: true } });
      const bookOf = new Map(copies.map((c) => [c.id, c.bookId]));
      const loans = new Map<number, number>();
      grouped.forEach((g) => {
        const b = bookOf.get(g.copyId);
        if (b) loans.set(b, (loans.get(b) ?? 0) + g._count._all);
      });
      all.sort((a, b) => (loans.get(b.id) ?? 0) - (loans.get(a.id) ?? 0));
      total = all.length;
      books = all.slice(skip, skip + take).map((b) => Object.assign(b, { loanCount: loans.get(b.id) ?? 0 }));
    } else {
      [books, total] = await Promise.all([
        prisma.book.findMany({ where, skip, take, orderBy, include: { major: true } }),
        prisma.book.count({ where }),
      ]);
    }
    const summary = await summarizeCopies(books.map((b) => b.id));
    res.json(paged(books.map((b) => ({ ...b, copiesSummary: summary.get(b.id) })), total, page, pageSize));
  }),
);

/** Tra đầu sách theo mã vạch bản sách hoặc mã sách (app bạn đọc quét nhãn trên sách) – công khai */
router.get(
  "/by-barcode/:code",
  asyncHandler(async (req, res) => {
    const code = req.params.code.trim();
    const copy = await prisma.bookCopy.findUnique({ where: { barcode: code }, select: { bookId: true, barcode: true, status: true, onsiteOnly: true } });
    const book = copy ? { id: copy.bookId } : await prisma.book.findUnique({ where: { code }, select: { id: true } });
    if (!book) throw notFound("Không tìm thấy sách với mã này");
    res.json({ bookId: book.id, copy });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const book = await prisma.book.findUnique({ where: { id }, include: { major: true } });
    if (!book) throw notFound("Không tìm thấy đầu sách");
    const summary = await summarizeCopies([id]);
    res.json({ ...book, copiesSummary: summary.get(id) });
  }),
);

const bookSchema = z.object({
  code: z.string().trim().min(2).max(30),
  title: z.string().trim().min(2),
  author: z.string().trim().min(2),
  publisher: z.string().trim().nullish(),
  publishYear: z.number().int().min(1900).max(2100).nullish(),
  isbn: z.string().trim().max(20).nullish(),
  docType: z.enum(DOC_TYPES),
  majorId: z.number().int().positive().nullable().optional(),
  shelf: z.string().trim().max(30).nullish(),
  description: z.string().nullish(),
  coverUrl: z.string().url().nullish().or(z.literal("").transform(() => undefined)),
});

router.post(
  "/",
  ...staffOnly,
  validate(bookSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.book.create({ data: req.body }));
  }),
);

router.patch(
  "/:id",
  ...staffOnly,
  validate(bookSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.book.update({ where: { id: parseId(req.params.id) }, data: req.body }));
  }),
);

router.get(
  "/:id/copies",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const copies = await prisma.bookCopy.findMany({
      where: { bookId: parseId(req.params.id) },
      orderBy: { barcode: "asc" },
      include: {
        import: { select: { code: true, importedAt: true } },
        liquidation: { select: { code: true, createdAt: true } },
        loanItems: {
          where: { returnedAt: null },
          include: { loan: { include: { reader: { include: { user: { select: { fullName: true } } } } } } },
        },
      },
    });
    res.json(copies);
  }),
);

export default router;
