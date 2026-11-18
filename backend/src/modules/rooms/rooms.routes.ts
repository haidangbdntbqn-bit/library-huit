import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { optionalAuth, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { ROOM_TYPES } from "../../utils/constants";
import { asyncHandler, badRequest, parseId, qint, qstr } from "../../utils/http";
import { ROOM_SHIFTS, bookingsOfDay, findAvailableRooms, roomState } from "./rooms.service";

/** Phòng đọc, phòng học nhóm: tình trạng phòng và quản lý phòng */
const router = Router();

/** Danh sách ca mượn phòng */
router.get("/shifts", (_req, res) => {
  res.json(ROOM_SHIFTS);
});

router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const day = qstr(req.query.date) ? new Date(String(req.query.date)) : new Date();
    const roomType = qstr(req.query.roomType);
    const [rooms, bookings] = await Promise.all([
      prisma.room.findMany({ where: roomType ? { roomType } : {}, orderBy: [{ roomType: "asc" }, { code: "asc" }] }),
      bookingsOfDay(day),
    ]);
    res.json(
      rooms.map((room) => {
        const mine = bookings.filter((b) => b.roomId === room.id);
        return {
          ...room,
          currentState: roomState(room, mine),
          // Chỉ trả khung giờ, không lộ thông tin người đặt
          // mine: lượt của chính người đang xem (để tô màu riêng)
          schedule: mine.map((b) => ({ startTime: b.startTime, endTime: b.endTime, status: b.status, people: b.people,
            mine: !!req.user?.readerId && b.readerId === req.user.readerId })),
        };
      }),
    );
  }),
);

/** Tìm phòng trống: ?start=ISO&end=ISO&people=5&roomType=GROUP */
router.get(
  "/available",
  asyncHandler(async (req, res) => {
    const start = new Date(String(req.query.start));
    const end = new Date(String(req.query.end));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw badRequest("Khung giờ không hợp lệ");
    }
    const people = qint(req.query.people) ?? 1;
    res.json(await findAvailableRooms(start, end, people, qstr(req.query.roomType)));
  }),
);

const schema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2),
  roomType: z.enum(ROOM_TYPES),
  capacity: z.number().int().min(1).max(500),
  floor: z.string().trim().max(20).nullish(),
  equipment: z.string().trim().max(300).nullish(),
  status: z.enum(["AVAILABLE", "MAINTENANCE"]).default("AVAILABLE"),
});

router.post(
  "/",
  ...staffOnly,
  validate(schema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.room.create({ data: req.body }));
  }),
);

router.patch(
  "/:id",
  ...staffOnly,
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.room.update({ where: { id: parseId(req.params.id) }, data: req.body }));
  }),
);

export default router;
