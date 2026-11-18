import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { READER_STATUS, READER_TYPES } from "../../utils/constants";
import { asyncHandler, conflict, notFound, paged, paging, parseId, qint, qstr } from "../../utils/http";
import { userSelect } from "../auth/auth.service";
import { newCardData, refreshCardExpiry } from "../cards/cards.routes";

/** Quản lý đọc giả: tình trạng đọc giả, hạn mức, tra cứu tại quầy */
const router = Router();
router.use(...staffOnly);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const q = qstr(req.query.q);
    const status = qstr(req.query.status);
    const majorId = qint(req.query.majorId);
    const where = {
      ...(status ? { status } : {}),
      ...(majorId ? { majorId } : {}),
      ...(q ? { OR: [{ studentCode: { contains: q } }, { user: { fullName: { contains: q } } }, { className: { contains: q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.reader.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: userSelect },
          major: true,
          card: true,
          _count: { select: { violations: { where: { status: "UNPAID" } } } },
        },
      }),
      prisma.reader.count({ where }),
    ]);
    // Số sách đang mượn của từng đọc giả
    const active = await prisma.loanItem.findMany({
      where: { returnedAt: null, loan: { readerId: { in: items.map((r) => r.id) } } },
      select: { loan: { select: { readerId: true } } },
    });
    const counts = new Map<number, number>();
    active.forEach((a) => counts.set(a.loan.readerId, (counts.get(a.loan.readerId) ?? 0) + 1));
    res.json(paged(items.map((r) => ({ ...r, activeLoans: counts.get(r.id) ?? 0 })), total, page, pageSize));
  }),
);

/** Tra cứu nhanh tại quầy theo MSSV hoặc số thẻ */
router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    const code = qstr(req.query.code);
    if (!code) throw notFound("Nhập MSSV hoặc số thẻ");
    const reader = await prisma.reader.findFirst({
      where: { OR: [{ studentCode: code }, { card: { cardNumber: code } }] },
      include: { user: { select: userSelect }, major: true },
    });
    if (!reader) throw notFound("Không tìm thấy bạn đọc với mã này");
    const card = await refreshCardExpiry(reader.id);
    const [activeLoans, unpaid] = await Promise.all([
      prisma.loanItem.count({ where: { returnedAt: null, loan: { readerId: reader.id } } }),
      prisma.violation.aggregate({ where: { readerId: reader.id, status: "UNPAID" }, _sum: { fineAmount: true }, _count: true }),
    ]);
    res.json({
      ...reader,
      card,
      activeLoans,
      unpaidViolations: unpaid._count,
      unpaidAmount: Number(unpaid._sum.fineAmount ?? 0),
    });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await refreshCardExpiry(id);
    const reader = await prisma.reader.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
        major: true,
        card: true,
        loans: { take: 20, orderBy: { borrowedAt: "desc" }, include: { items: { include: { copy: { include: { book: true } } } } } },
        violations: { orderBy: { createdAt: "desc" } },
        bookings: { take: 10, orderBy: { startTime: "desc" }, include: { room: true } },
      },
    });
    if (!reader) throw notFound("Không tìm thấy đọc giả");
    res.json(reader);
  }),
);

const createSchema = z.object({
  username: z.string().trim().min(4).regex(/^[a-zA-Z0-9_.]+$/),
  password: z.string().min(6),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(20).nullish(),
  studentCode: z.string().trim().min(3),
  readerType: z.enum(READER_TYPES).default("STUDENT"),
  majorId: z.number().int().positive().optional(),
  className: z.string().trim().max(30).nullish(),
});

/** Thủ thư tạo đọc giả tại quầy, có thể cấp thẻ ngay */
router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const d = req.body as z.infer<typeof createSchema>;
    if (await prisma.user.findUnique({ where: { username: d.username } })) throw conflict("Tên đăng nhập đã tồn tại");
    if (await prisma.reader.findUnique({ where: { studentCode: d.studentCode } })) throw conflict("MSSV / mã cán bộ đã tồn tại");
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        username: d.username,
        passwordHash: await bcrypt.hash(d.password, 10),
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        role: "READER",
        reader: {
          create: {
            studentCode: d.studentCode,
            readerType: d.readerType,
            majorId: d.majorId,
            className: d.className,
            card: { create: await newCardData(d.studentCode, d.readerType, now) },
          },
        },
      },
      select: { ...userSelect, reader: { include: { card: true, major: true } } },
    });
    const { reader: created, ...userInfo } = user;
    const reader = { ...created, user: userInfo };
    res.status(201).json(reader);
  }),
);

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().nullish(),
  phone: z.string().trim().max(20).nullish(),
  readerType: z.enum(READER_TYPES).optional(),
  majorId: z.number().int().positive().nullable().optional(),
  className: z.string().trim().max(30).nullish(),
  status: z.enum(READER_STATUS).optional(),
  maxBooks: z.number().int().min(0).max(50).optional(),
});

router.patch(
  "/:id",
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { fullName, email, phone, ...readerData } = req.body as z.infer<typeof updateSchema>;
    const current = await prisma.reader.findUnique({ where: { id } });
    if (!current) throw notFound("Không tìm thấy đọc giả");
    await prisma.$transaction([
      prisma.user.update({ where: { id: current.userId }, data: { fullName, email, phone } }),
      prisma.reader.update({ where: { id }, data: readerData }),
    ]);
    const reader = await prisma.reader.findUnique({
      where: { id },
      include: { user: { select: userSelect }, major: true, card: true },
    });
    res.json(reader);
  }),
);

export default router;
