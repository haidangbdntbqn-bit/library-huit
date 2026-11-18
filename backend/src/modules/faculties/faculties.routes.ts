import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { adminOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler, parseId } from "../../utils/http";

/** Danh mục khoa và tỉ lệ hoa hồng bán sách, tài liệu */
const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await prisma.faculty.findMany({ orderBy: { name: "asc" }, include: { majors: { select: { id: true, code: true, name: true } } } }));
  }),
);

const schema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(150),
  commissionRate: z.number().min(0).max(100),
});

router.post(
  "/",
  ...adminOnly,
  validate(schema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.faculty.create({ data: req.body }));
  }),
);

router.patch(
  "/:id",
  ...adminOnly,
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.faculty.update({ where: { id: parseId(req.params.id) }, data: req.body }));
  }),
);

export default router;
