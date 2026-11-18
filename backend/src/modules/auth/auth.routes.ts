import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, signToken } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { READER_TYPES } from "../../utils/constants";
import { HttpError, asyncHandler, badRequest, conflict } from "../../utils/http";
import { newCardData } from "../cards/cards.routes";
import { publicUser, toAuthUser } from "./auth.service";

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1, "Nhập tên đăng nhập"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { username }, include: { reader: true, staff: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "Sai tên đăng nhập hoặc mật khẩu");
    }
    if (!user.isActive) throw new HttpError(403, "Tài khoản đã bị khóa, vui lòng liên hệ thư viện");
    res.json({ token: signToken(toAuthUser(user)), user: publicUser(user) });
  }),
);

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(4, "Tên đăng nhập tối thiểu 4 ký tự")
    .regex(/^[a-zA-Z0-9_.]+$/, "Tên đăng nhập chỉ gồm chữ không dấu, số, _ và ."),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  fullName: z.string().trim().min(2, "Nhập họ tên"),
  email: z.string().trim().email("Email không hợp lệ").nullish().or(z.literal("").transform(() => undefined)),
  phone: z.string().trim().max(20).nullish(),
  studentCode: z.string().trim().min(3, "Nhập MSSV / mã cán bộ"),
  readerType: z.enum(READER_TYPES).default("STUDENT"),
  majorId: z.number().int().positive().optional(),
  className: z.string().trim().max(30).nullish(),
});

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof registerSchema>;
    if (await prisma.user.findUnique({ where: { username: data.username } })) throw conflict("Tên đăng nhập đã tồn tại");
    if (await prisma.reader.findUnique({ where: { studentCode: data.studentCode } })) {
      throw conflict("MSSV / mã cán bộ này đã được đăng ký");
    }
    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: await bcrypt.hash(data.password, 10),
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: "READER",
        reader: {
          create: {
            studentCode: data.studentCode,
            readerType: data.readerType,
            majorId: data.majorId,
            className: data.className,
            // Thẻ sinh viên dùng làm thẻ thư viện, kích hoạt ngay, không cần duyệt
            card: { create: await newCardData(data.studentCode, data.readerType) },
          },
        },
      },
      include: { reader: true, staff: true },
    });
    res.status(201).json({ token: signToken(toAuthUser(user)), user: publicUser(user) });
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      include: { reader: { include: { major: true, card: true } }, staff: true },
    });
    res.json(publicUser(user));
  }),
);

const profileSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email("Email không hợp lệ").nullish(),
  phone: z.string().trim().max(20).nullish(),
});

router.patch(
  "/me",
  authenticate,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body });
    res.json(publicUser(user));
  }),
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});

router.post(
  "/change-password",
  authenticate,
  validate(passwordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest("Mật khẩu hiện tại không đúng");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
    res.json({ message: "Đã đổi mật khẩu" });
  }),
);

export default router;
