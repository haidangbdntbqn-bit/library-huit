import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler, parseId } from "../../utils/http";

/** Danh mục ngành học */
const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await prisma.major.findMany({ orderBy: { name: "asc" }, include: { faculty: { select: { id: true, code: true, name: true } } } }));
  }),
);

const schema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(150),
  facultyId: z.number().int().positive().nullable().optional(),
});

router.post(
  "/",
  ...staffOnly,
  validate(schema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.major.create({ data: req.body }));
  }),
);

router.patch(
  "/:id",
  ...staffOnly,
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.major.update({ where: { id: parseId(req.params.id) }, data: req.body }));
  }),
);

export default router;
