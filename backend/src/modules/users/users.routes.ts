import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { adminOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { ROLES } from "../../utils/constants";
import { asyncHandler, badRequest, conflict, paged, paging, parseId, qstr } from "../../utils/http";
import { userSelect } from "../auth/auth.service";

/** Quản lý tài khoản người dùng (chỉ ADMIN) */
const router = Router();
router.use(...adminOnly);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const q = qstr(req.query.q);
    const role = qstr(req.query.role);
    const active = qstr(req.query.active);
    const where = {
      ...(role ? { role } : {}),
      ...(active ? { isActive: active === "true" } : {}),
      ...(q ? { OR: [{ username: { contains: q } }, { fullName: { contains: q } }, { email: { contains: q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: { ...userSelect, reader: { select: { studentCode: true } }, staff: { select: { staffCode: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

const createSchema = z.object({
  username: z.string().trim().min(4).regex(/^[a-zA-Z0-9_.]+$/),
  password: z.string().min(6),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(20).nullish(),
});

/** Tạo tài khoản quản trị viên. Thủ thư tạo ở mục Nhân viên, bạn đọc tạo ở mục Đọc giả. */
router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof createSchema>;
    if (await prisma.user.findUnique({ where: { username: data.username } })) throw conflict("Tên đăng nhập đã tồn tại");
    const { password, ...info } = data;
    const user = await prisma.user.create({
      data: { ...info, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" },
      select: userSelect,
    });
    res.status(201).json(user);
  }),
);

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(20).nullish(),
  isActive: z.boolean().optional(),
  role: z.enum(ROLES).optional(),
});

router.patch(
  "/:id",
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = req.body as z.infer<typeof updateSchema>;
    if (id === req.user!.id && data.isActive === false) throw badRequest("Không thể tự khóa tài khoản của mình");
    const current = await prisma.user.findUniqueOrThrow({ where: { id }, include: { reader: true, staff: true } });
    if (data.role && data.role !== current.role) {
      // Chỉ cho đổi qua lại LIBRARIAN <-> ADMIN với tài khoản nhân viên
      const ok = current.staff && data.role !== "READER";
      if (!ok) throw badRequest("Chỉ đổi được vai trò giữa Thủ thư và Quản trị với tài khoản nhân viên");
    }
    res.json(await prisma.user.update({ where: { id }, data, select: userSelect }));
  }),
);

router.patch(
  "/:id/reset-password",
  validate(z.object({ newPassword: z.string().min(6) })),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(req.body.newPassword, 10) } });
    res.json({ message: "Đã đặt lại mật khẩu" });
  }),
);

export default router;
