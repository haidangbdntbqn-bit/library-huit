import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { endOfDay, startOfDay } from "../../utils/date";
import { asyncHandler, badRequest, notFound, paged, paging, parseId, qint, qstr } from "../../utils/http";
import { getSettings } from "../settings/settings.service";
import { inspectRoom, roomChecklist } from "../rules/rules";
import { createBooking, validateSlot } from "./rooms.service";

/** Mượn phòng: bạn đọc đặt, thủ thư duyệt / nhận phòng / trả phòng */
const router = Router();

const include = {
  room: true,
  reader: { include: { user: { select: { fullName: true, phone: true } } } },
} satisfies Prisma.RoomBookingInclude;

// ----- Bạn đọc -----

router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    res.json(
      await prisma.roomBooking.findMany({
        where: { readerId: currentReaderId(req) },
        orderBy: { startTime: "desc" },
        include: { room: true },
      }),
    );
  }),
);

const createSchema = z.object({
  roomId: z.number().int().positive(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  people: z.number().int().min(1),
  purpose: z.string().trim().max(300).nullish(),
});

router.post(
  "/",
  ...readerOnly,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createBooking(currentReaderId(req), req.body));
  }),
);

router.patch(
  "/:id/cancel-mine",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    const b = await prisma.roomBooking.findUnique({ where: { id: parseId(req.params.id) } });
    if (!b || b.readerId !== currentReaderId(req)) throw notFound();
    if (!["PENDING", "APPROVED"].includes(b.status)) throw badRequest("Không thể hủy lượt đặt này");
    res.json(await prisma.roomBooking.update({ where: { id: b.id }, data: { status: "CANCELLED" }, include: { room: true } }));
  }),
);

// ----- Thủ thư -----

router.get(
  "/",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const status = qstr(req.query.status);
    const roomId = qint(req.query.roomId);
    const date = qstr(req.query.date);
    const q = qstr(req.query.q);
    const where: Prisma.RoomBookingWhereInput = {
      ...(status ? { status } : {}),
      ...(roomId ? { roomId } : {}),
      ...(date ? { startTime: { gte: startOfDay(new Date(date)), lte: endOfDay(new Date(date)) } } : {}),
      ...(q ? { OR: [{ code: { contains: q } }, { reader: { studentCode: { contains: q } } }, { reader: { user: { fullName: { contains: q } } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.roomBooking.findMany({ where, skip, take, orderBy: { startTime: "asc" }, include }),
      prisma.roomBooking.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

// ----- Trả phòng kèm kiểm tra tình trạng phòng -----

/** Danh mục cần kiểm tra khi trả phòng + mức phạt gợi ý */
router.get(
  "/:id/checklist",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const b = await prisma.roomBooking.findUnique({ where: { id: parseId(req.params.id) }, include: { room: true } });
    if (!b) throw notFound("Không tìm thấy lượt đặt phòng");
    const s = await getSettings();
    res.json({ items: roomChecklist(b.room.equipment), fees: { DAMAGED: s.ROOM_DAMAGE_FINE, LOST: s.ROOM_LOST_FINE } });
  }),
);

const checkoutSchema = z
  .object({
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          state: z.enum(["OK", "DAMAGED", "LOST"]),
          fee: z.number().min(0).nullish(),
          note: z.string().trim().max(200).nullish(),
        }),
      )
      .max(30)
      .default([]),
    maintenance: z.boolean().default(false), // chuyển phòng sang "Bảo trì" để sửa chữa
    note: z.string().trim().max(300).optional(),
  })
  .default({});

/**
 * Trả phòng: thủ thư kiểm tra từng thiết bị, đồ đạc. Mục hư hỏng / bị mất
 * được ghi thành vi phạm của bạn đọc đã mượn phòng (kèm tiền phạt), có thể chuyển phòng sang bảo trì.
 */
router.patch(
  "/:id/checkout",
  ...staffOnly,
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const b = await prisma.roomBooking.findUnique({ where: { id: parseId(req.params.id) }, include: { room: true } });
    if (!b) throw notFound("Không tìm thấy lượt đặt phòng");
    if (b.status !== "IN_USE") throw badRequest("Chỉ trả phòng cho lượt đang sử dụng");
    const body = checkoutSchema.parse(req.body);
    const s = await getSettings();
    const result = inspectRoom(body.items, s);
    const staffName = req.user?.fullName ?? null;

    const updated = await prisma.$transaction(async (tx) => {
      for (const i of result.issues) {
        await tx.violation.create({
          data: {
            readerId: b.readerId,
            bookingId: b.id,
            type: i.state === "LOST" ? "LOST" : "DAMAGED",
            description: `${b.room.name} (${b.code}): ${i.name} ${i.state === "LOST" ? "bị mất" : "hư hỏng"}${i.note ? ` – ${i.note}` : ""}`.slice(0, 500),
            fineAmount: i.fee,
          },
        });
      }
      if (body.maintenance && result.condition === "ISSUE") {
        await tx.room.update({ where: { id: b.roomId }, data: { status: "MAINTENANCE" } });
      }
      return tx.roomBooking.update({
        where: { id: b.id },
        data: {
          status: "COMPLETED",
          checkedOutAt: new Date(),
          roomCondition: result.condition,
          inspection: JSON.stringify(result.items),
          damageFee: result.total,
          inspectedBy: staffName,
          note: [result.summary, body.note].filter(Boolean).join(". ").slice(0, 300),
        },
        include,
      });
    });
    res.json(updated);
  }),
);

type Action = { from: string[]; to: string; stamp?: "checkedInAt" | "checkedOutAt" };
const actions: Record<string, Action> = {
  approve: { from: ["PENDING"], to: "APPROVED" },
  reject: { from: ["PENDING", "APPROVED"], to: "REJECTED" },
  checkin: { from: ["APPROVED"], to: "IN_USE", stamp: "checkedInAt" },
  cancel: { from: ["PENDING", "APPROVED"], to: "CANCELLED" },
};

router.patch(
  "/:id/:action",
  ...staffOnly,
  validate(z.object({ note: z.string().trim().max(300).optional() }).default({})),
  asyncHandler(async (req, res) => {
    const action = actions[req.params.action];
    if (!action) throw notFound("Thao tác không hợp lệ");
    const b = await prisma.roomBooking.findUnique({ where: { id: parseId(req.params.id) }, include: { room: true } });
    if (!b) throw notFound("Không tìm thấy lượt đặt phòng");
    if (!action.from.includes(b.status)) throw badRequest("Trạng thái hiện tại không cho phép thao tác này");
    if (req.params.action === "approve") {
      // Kiểm tra lại trùng ca với các lượt đã duyệt khác
      await validateSlot(b.room, b.startTime, b.endTime, b.people, b.id);
    }
    const updated = await prisma.roomBooking.update({
      where: { id: b.id },
      data: {
        status: action.to,
        note: req.body?.note,
        checkedInAt: action.stamp === "checkedInAt" ? new Date() : undefined,
        checkedOutAt: action.stamp === "checkedOutAt" ? new Date() : undefined,
      },
      include,
    });
    res.json(updated);
  }),
);

export default router;
