import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { genCode } from "../../utils/code";
import { asyncHandler, badRequest, forbidden, notFound, paged, paging, parseId } from "../../utils/http";

/** Phiếu nhập sách: mỗi dòng sinh ra N bản sách với mã vạch mới */
const router = Router();
router.use(...staffOnly);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const [items, total] = await Promise.all([
      prisma.bookImport.findMany({
        skip,
        take,
        orderBy: { importedAt: "desc" },
        include: { staff: { include: { user: { select: { fullName: true } } } }, _count: { select: { copies: true } } },
      }),
      prisma.bookImport.count(),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.bookImport.findUnique({
      where: { id: parseId(req.params.id) },
      include: {
        staff: { include: { user: { select: { fullName: true } } } },
        copies: { include: { book: { select: { code: true, title: true } } }, orderBy: { barcode: "asc" } },
      },
    });
    if (!item) throw notFound("Không tìm thấy phiếu nhập");
    res.json(item);
  }),
);

const schema = z.object({
  supplier: z.string().trim().nullish(),
  note: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        bookId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(200),
        unitPrice: z.number().min(0).default(0),
        onsiteOnly: z.boolean().default(false),
      }),
    )
    .min(1, "Phiếu nhập cần ít nhất 1 dòng"),
});

router.post(
  "/",
  validate(schema),
  asyncHandler(async (req, res) => {
    const staffId = req.user!.staffId;
    if (!staffId) throw forbidden("Tài khoản chưa gắn với hồ sơ nhân viên");
    const data = req.body as z.infer<typeof schema>;
    const books = await prisma.book.findMany({ where: { id: { in: data.items.map((i) => i.bookId) } } });
    if (books.length !== new Set(data.items.map((i) => i.bookId)).size) throw badRequest("Có đầu sách không tồn tại");
    const totalCost = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    const result = await prisma.$transaction(async (tx) => {
      const imp = await tx.bookImport.create({
        data: { code: genCode("PN"), staffId, supplier: data.supplier, note: data.note, totalCost },
      });
      for (const item of data.items) {
        const book = books.find((b) => b.id === item.bookId)!;
        const existing = await tx.bookCopy.count({ where: { bookId: book.id } });
        const copies = Array.from({ length: item.quantity }, (_, i) => ({
          barcode: `${book.code}-${String(existing + i + 1).padStart(3, "0")}`,
          bookId: book.id,
          importId: imp.id,
          onsiteOnly: item.onsiteOnly,
        }));
        await tx.bookCopy.createMany({ data: copies });
      }
      return imp;
    });
    res.status(201).json(result);
  }),
);

export default router;
