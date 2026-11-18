import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { adminOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler, conflict, parseId, qstr } from "../../utils/http";
import { userSelect } from "../auth/auth.service";

/** Quản lý nhân viên thư viện (chỉ ADMIN) */
const router = Router();
router.use(...adminOnly);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = qstr(req.query.q);
    const items = await prisma.staff.findMany({
      where: q ? { OR: [{ staffCode: { contains: q } }, { user: { fullName: { contains: q } } }] } : {},
      include: { user: { select: userSelect }, _count: { select: { loans: true } } },
      orderBy: { id: "asc" },
    });
    res.json(items);
  }),
);

const createSchema = z.object({
  username: z.string().trim().min(4).regex(/^[a-zA-Z0-9_.]+$/),
  password: z.string().min(6),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(20).nullish(),
  staffCode: z.string().trim().min(2),
  position: z.string().trim().min(2),
  hiredAt: z.coerce.date().nullish(),
  role: z.enum(["LIBRARIAN", "ADMIN"]).default("LIBRARIAN"),
});

router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const d = req.body as z.infer<typeof createSchema>;
    if (await prisma.user.findUnique({ where: { username: d.username } })) throw conflict("Tên đăng nhập đã tồn tại");
    if (await prisma.staff.findUnique({ where: { staffCode: d.staffCode } })) throw conflict("Mã nhân viên đã tồn tại");
    const staff = await prisma.staff.create({
      data: {
        staffCode: d.staffCode,
        position: d.position,
        hiredAt: d.hiredAt,
        user: {
          create: {
            username: d.username,
            passwordHash: await bcrypt.hash(d.password, 10),
            fullName: d.fullName,
            email: d.email,
            phone: d.phone,
            role: d.role,
          },
        },
      },
      include: { user: { select: userSelect } },
    });
    res.status(201).json(staff);
  }),
);

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(20).nullish(),
  position: z.string().trim().min(2).optional(),
  hiredAt: z.coerce.date().nullish(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/:id",
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { fullName, email, phone, isActive, position, hiredAt } = req.body as z.infer<typeof updateSchema>;
    const staff = await prisma.staff.update({
      where: { id: parseId(req.params.id) },
      data: { position, hiredAt, user: { update: { fullName, email, phone, isActive } } },
      include: { user: { select: userSelect } },
    });
    res.json(staff);
  }),
);

export default router;
