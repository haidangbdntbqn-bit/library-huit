import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { genCode } from "../../utils/code";
import { PAYMENT_METHODS } from "../../utils/constants";
import { asyncHandler, badRequest, notFound, paged, paging, parseId, qstr } from "../../utils/http";

/**
 * Mua tài liệu bài giảng. Chưa tích hợp cổng thanh toán: bạn đọc đặt hàng,
 * thanh toán tại quầy hoặc chuyển khoản, thủ thư xác nhận "Đã thanh toán".
 */
const router = Router();

const include = {
  items: { include: { material: { select: { code: true, title: true, format: true } } } },
  reader: { include: { user: { select: { fullName: true } } } },
} satisfies Prisma.OrderInclude;

router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    res.json(await prisma.order.findMany({ where: { readerId: currentReaderId(req) }, orderBy: { createdAt: "desc" }, include }));
  }),
);

const createSchema = z.object({
  items: z
    .array(z.object({ materialId: z.number().int().positive(), quantity: z.number().int().min(1).max(50) }))
    .min(1, "Giỏ hàng trống"),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
});

router.post(
  "/",
  ...readerOnly,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const readerId = currentReaderId(req);
    const { items, paymentMethod } = req.body as z.infer<typeof createSchema>;
    const order = await prisma.$transaction(async (tx) => {
      const materials = await tx.material.findMany({ where: { id: { in: items.map((i) => i.materialId) }, isActive: true } });
      let total = 0;
      for (const item of items) {
        const m = materials.find((x) => x.id === item.materialId);
        if (!m) throw badRequest("Có tài liệu không còn bán");
        if (m.format === "PRINT") {
          // Trừ tồn kho có điều kiện để tránh bán vượt số lượng
          const updated = await tx.material.updateMany({
            where: { id: m.id, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) throw badRequest(`"${m.title}" chỉ còn ${m.stock} cuốn`);
        }
        total += Number(m.price) * item.quantity;
      }
      return tx.order.create({
        data: {
          code: genCode("DH"),
          readerId,
          paymentMethod,
          totalAmount: total,
          items: {
            create: items.map((i) => ({
              materialId: i.materialId,
              quantity: i.quantity,
              unitPrice: materials.find((m) => m.id === i.materialId)!.price,
            })),
          },
        },
        include,
      });
    });
    res.status(201).json(order);
  }),
);

async function cancelOrder(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { material: true } } } });
    if (!order) throw notFound("Không tìm thấy đơn hàng");
    if (order.status !== "PENDING") throw badRequest("Chỉ hủy được đơn chưa thanh toán");
    for (const item of order.items) {
      if (item.material.format === "PRINT") {
        await tx.material.update({ where: { id: item.materialId }, data: { stock: { increment: item.quantity } } });
      }
    }
    return tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" }, include });
  });
}

router.patch(
  "/:id/cancel-mine",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.readerId !== currentReaderId(req)) throw notFound("Không tìm thấy đơn hàng");
    res.json(await cancelOrder(id));
  }),
);

// ----- Thủ thư -----

router.get(
  "/",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const status = qstr(req.query.status);
    const q = qstr(req.query.q);
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ code: { contains: q } }, { reader: { studentCode: { contains: q } } }, { reader: { user: { fullName: { contains: q } } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.order.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include }),
      prisma.order.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

router.patch(
  "/:id/pay",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: parseId(req.params.id) } });
    if (order.status !== "PENDING") throw badRequest("Đơn hàng không ở trạng thái chờ thanh toán");
    res.json(await prisma.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() }, include }));
  }),
);

router.patch(
  "/:id/complete",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: parseId(req.params.id) } });
    if (order.status !== "PAID") throw badRequest("Chỉ giao được đơn đã thanh toán");
    res.json(await prisma.order.update({ where: { id: order.id }, data: { status: "COMPLETED" }, include }));
  }),
);

router.patch(
  "/:id/cancel",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    res.json(await cancelOrder(parseId(req.params.id)));
  }),
);

export default router;
