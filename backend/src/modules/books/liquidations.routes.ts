import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { genCode } from "../../utils/code";
import { asyncHandler, badRequest, forbidden, notFound, paged, paging, parseId } from "../../utils/http";

/** Phiếu thanh lý: chuyển các bản sách cũ/hỏng sang trạng thái LIQUIDATED */
const router = Router();
router.use(...staffOnly);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const [items, total] = await Promise.all([
      prisma.liquidation.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { staff: { include: { user: { select: { fullName: true } } } }, _count: { select: { copies: true } } },
      }),
      prisma.liquidation.count(),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.liquidation.findUnique({
      where: { id: parseId(req.params.id) },
      include: {
        staff: { include: { user: { select: { fullName: true } } } },
        copies: { include: { book: { select: { code: true, title: true } } } },
      },
    });
    if (!item) throw notFound("Không tìm thấy phiếu thanh lý");
    res.json(item);
  }),
);

const schema = z.object({
  reason: z.string().trim().min(3, "Nhập lý do thanh lý"),
  barcodes: z.array(z.string().trim().min(1)).min(1, "Chọn ít nhất 1 bản sách"),
});

router.post(
  "/",
  validate(schema),
  asyncHandler(async (req, res) => {
    const staffId = req.user!.staffId;
    if (!staffId) throw forbidden("Tài khoản chưa gắn với hồ sơ nhân viên");
    const { reason, barcodes } = req.body as z.infer<typeof schema>;
    const unique = [...new Set(barcodes)];
    const copies = await prisma.bookCopy.findMany({ where: { barcode: { in: unique } } });
    const missing = unique.filter((b) => !copies.some((c) => c.barcode === b));
    if (missing.length) throw badRequest(`Không tìm thấy mã vạch: ${missing.join(", ")}`);
    const invalid = copies.filter((c) => ["BORROWED", "RESERVED", "LIQUIDATED"].includes(c.status));
    if (invalid.length) throw badRequest(`Bản sách đang mượn, đang giữ cho bạn đọc hoặc đã thanh lý: ${invalid.map((c) => c.barcode).join(", ")}`);

    const result = await prisma.$transaction(async (tx) => {
      const liq = await tx.liquidation.create({ data: { code: genCode("TL"), staffId, reason } });
      await tx.bookCopy.updateMany({
        where: { id: { in: copies.map((c) => c.id) } },
        data: { status: "LIQUIDATED", liquidationId: liq.id },
      });
      return liq;
    });
    res.status(201).json(result);
  }),
);

export default router;
