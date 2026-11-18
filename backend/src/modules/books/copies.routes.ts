import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler, badRequest, notFound, parseId } from "../../utils/http";

/** Từng bản sách (mã vạch) */
const router = Router();
router.use(...staffOnly);

router.get(
  "/barcode/:barcode",
  asyncHandler(async (req, res) => {
    const copy = await prisma.bookCopy.findUnique({ where: { barcode: req.params.barcode }, include: { book: true } });
    if (!copy) throw notFound("Không tìm thấy bản sách với mã vạch này");
    res.json(copy);
  }),
);

const schema = z.object({
  status: z.enum(["AVAILABLE", "DAMAGED", "LOST"]).optional(),
  onsiteOnly: z.boolean().optional(),
  condition: z.string().trim().max(100).optional(),
});

router.patch(
  "/:id",
  validate(schema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { id } });
    if (["BORROWED", "RESERVED", "LIQUIDATED"].includes(copy.status)) {
      throw badRequest("Không thể sửa bản sách đang được mượn, đang giữ cho bạn đọc hoặc đã thanh lý");
    }
    res.json(await prisma.bookCopy.update({ where: { id }, data: req.body }));
  }),
);

export default router;
