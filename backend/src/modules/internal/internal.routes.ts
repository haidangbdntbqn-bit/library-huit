import { Router } from "express";
import { prisma } from "../../config/prisma";
import { internalOnly } from "../../middlewares/auth";
import { daysLate } from "../../utils/date";
import { asyncHandler, parseId } from "../../utils/http";

/** API nội bộ cho Rasa action server (bảo vệ bằng header x-internal-key) */
const router = Router();
router.use(internalOnly);

/** Hồ sơ ngắn của bạn đọc (ngành, khoa) để chatbot gợi ý sách đúng ngành */
router.get(
  "/users/:userId/profile",
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.userId);
    const r = await prisma.reader.findFirst({
      where: { userId },
      include: { user: { select: { fullName: true } }, major: { include: { faculty: true } } },
    });
    res.json(
      r
        ? { fullName: r.user.fullName, majorId: r.majorId, majorName: r.major?.name ?? null, facultyName: r.major?.faculty?.name ?? null }
        : null,
    );
  }),
);

router.get(
  "/users/:userId/loans",
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.userId);
    const items = await prisma.loanItem.findMany({
      where: { returnedAt: null, loan: { reader: { userId } } },
      orderBy: { dueAt: "asc" },
      include: { copy: { include: { book: { select: { title: true } } } } },
    });
    res.json(
      items.map((i) => ({
        itemId: i.id,
        title: i.copy.book.title,
        dueAt: i.dueAt,
        daysLate: daysLate(i.dueAt),
        renewCount: i.renewCount,
      })),
    );
  }),
);

router.get(
  "/users/:userId/bookings",
  asyncHandler(async (req, res) => {
    const userId = parseId(req.params.userId);
    const items = await prisma.roomBooking.findMany({
      where: { reader: { userId }, endTime: { gte: new Date() }, status: { in: ["PENDING", "APPROVED", "IN_USE"] } },
      orderBy: { startTime: "asc" },
      include: { room: { select: { name: true } } },
    });
    res.json(items.map((b) => ({ room: b.room.name, startTime: b.startTime, endTime: b.endTime, status: b.status })));
  }),
);

export default router;
