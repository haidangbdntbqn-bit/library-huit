import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { VIOLATION_TYPES } from "../../utils/constants";
import { asyncHandler, badRequest, paged, paging, parseId, qint, qstr } from "../../utils/http";

/** Xử lý vi phạm: ghi nhận, thu tiền phạt, miễn phạt */
const router = Router();

/** Bạn đọc xem vi phạm của mình */
router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.violation.findMany({
        where: { readerId: currentReaderId(req) },
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);

// Các API bên dưới chỉ dành cho thủ thư / quản trị
router.use(...staffOnly);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const status = qstr(req.query.status);
    const type = qstr(req.query.type);
    const readerId = qint(req.query.readerId);
    const q = qstr(req.query.q);
    const where = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(readerId ? { readerId } : {}),
      ...(q ? { OR: [{ reader: { studentCode: { contains: q } } }, { reader: { user: { fullName: { contains: q } } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.violation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          reader: { include: { user: { select: { fullName: true } } } },
          loanItem: { include: { copy: { include: { book: { select: { title: true } } } } } },
        },
      }),
      prisma.violation.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

const createSchema = z.object({
  readerId: z.number().int().positive(),
  type: z.enum(VIOLATION_TYPES),
  description: z.string().trim().min(3),
  fineAmount: z.number().min(0).default(0),
});

router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.violation.create({ data: req.body }));
  }),
);

async function resolve(id: number, status: "PAID" | "WAIVED") {
  const v = await prisma.violation.findUniqueOrThrow({ where: { id } });
  if (v.status !== "UNPAID") throw badRequest("Vi phạm này đã được xử lý");
  return prisma.violation.update({ where: { id }, data: { status, resolvedAt: new Date() } });
}

router.patch("/:id/pay", asyncHandler(async (req, res) => res.json(await resolve(parseId(req.params.id), "PAID"))));
router.patch("/:id/waive", asyncHandler(async (req, res) => res.json(await resolve(parseId(req.params.id), "WAIVED"))));

export default router;
