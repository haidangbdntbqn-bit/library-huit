import type { Room, RoomBooking } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BOOKING_BLOCKING } from "../../utils/constants";
import { genCode } from "../../utils/code";
import { endOfDay, startOfDay } from "../../utils/date";
import { badRequest, notFound } from "../../utils/http";
import { refreshCardExpiry } from "../cards/cards.routes";
import { getSettings } from "../settings/settings.service";
import { ROOM_SHIFTS, matchShift, slotBlockReason } from "../rules/rules";

export type RoomState = "AVAILABLE" | "IN_USE" | "RESERVED" | "MAINTENANCE";

/** Tình trạng phòng tại thời điểm `at` */
export function roomState(room: Room, bookings: RoomBooking[], at = new Date()): RoomState {
  if (room.status === "MAINTENANCE") return "MAINTENANCE";
  const now = bookings.filter((b) => b.roomId === room.id && b.startTime <= at && b.endTime > at);
  if (now.some((b) => b.status === "IN_USE")) return "IN_USE";
  if (now.some((b) => b.status === "APPROVED")) return "RESERVED";
  return "AVAILABLE";
}

/** Số người đã đặt trùng khung giờ (phòng đọc tính theo chỗ ngồi) */
async function overlapping(roomId: number, start: Date, end: Date, excludeId?: number) {
  return prisma.roomBooking.findMany({
    where: {
      roomId,
      status: { in: BOOKING_BLOCKING },
      startTime: { lt: end },
      endTime: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

/** Phòng còn trống theo khung giờ và số người */
export async function findAvailableRooms(start: Date, end: Date, people: number, roomType?: string) {
  const rooms = await prisma.room.findMany({
    where: { status: "AVAILABLE", capacity: { gte: people }, ...(roomType ? { roomType } : {}) },
    orderBy: [{ roomType: "asc" }, { capacity: "asc" }],
  });
  const result: Array<Room & { freeSeats: number }> = [];
  for (const room of rooms) {
    const clash = await overlapping(room.id, start, end);
    if (room.roomType === "GROUP") {
      if (clash.length === 0) result.push({ ...room, freeSeats: room.capacity });
    } else {
      const used = clash.reduce((s, b) => s + b.people, 0);
      if (room.capacity - used >= people) result.push({ ...room, freeSeats: room.capacity - used });
    }
  }
  return result;
}

export { ROOM_SHIFTS, matchShift };

export async function validateSlot(room: Room, start: Date, end: Date, people: number, excludeId?: number) {
  if (!matchShift(start, end)) {
    throw badRequest(`Chỉ mượn phòng theo ca: ${ROOM_SHIFTS.map((s) => `${s.start}h–${s.end}h`).join(", ")}`);
  }
  if (end.getTime() <= Date.now()) throw badRequest("Ca này đã kết thúc, vui lòng chọn ca khác");
  const clash = await overlapping(room.id, start, end, excludeId);
  const reason = slotBlockReason(room, people, clash);
  if (reason) throw badRequest(reason);
}

export interface BookingInput {
  roomId: number;
  startTime: Date;
  endTime: Date;
  people: number;
  purpose?: string;
}

export async function createBooking(readerId: number, input: BookingInput) {
  const reader = await prisma.reader.findUnique({ where: { id: readerId } });
  if (!reader || reader.status !== "ACTIVE") throw badRequest("Bạn đọc đang bị tạm ngưng quyền sử dụng dịch vụ");
  const card = await refreshCardExpiry(readerId);
  if (card?.status !== "ACTIVE") throw badRequest("Bạn cần có thẻ mượn còn hiệu lực để mượn phòng");
  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw notFound("Không tìm thấy phòng");
  await validateSlot(room, input.startTime, input.endTime, input.people);
  const mine = await prisma.roomBooking.count({
    where: {
      readerId,
      status: { in: BOOKING_BLOCKING },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
  });
  if (mine) throw badRequest("Bạn đã có một lượt đặt phòng khác trùng khung giờ");
  const s = await getSettings();
  return prisma.roomBooking.create({
    data: {
      code: genCode("DP"),
      readerId,
      roomId: room.id,
      startTime: input.startTime,
      endTime: input.endTime,
      people: input.people,
      purpose: input.purpose,
      status: s.AUTO_APPROVE_BOOKING ? "APPROVED" : "PENDING",
    },
    include: { room: true },
  });
}

/** Lịch đặt phòng trong ngày (dùng cho trang tình trạng phòng) */
export async function bookingsOfDay(day: Date) {
  return prisma.roomBooking.findMany({
    where: { startTime: { gte: startOfDay(day), lte: endOfDay(day) }, status: { in: [...BOOKING_BLOCKING, "COMPLETED"] } },
    orderBy: { startTime: "asc" },
  });
}
