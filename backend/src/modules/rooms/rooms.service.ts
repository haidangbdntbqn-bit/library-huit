import type { Prisma, Room, RoomBooking } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BOOKING_BLOCKING } from "../../utils/constants";
import { genCode } from "../../utils/code";
import { endOfDay, startOfDay } from "../../utils/date";
import { badRequest, conflict, notFound } from "../../utils/http";
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

/** Client dùng chung cho truy vấn thường và truy vấn trong giao dịch */
type Db = Prisma.TransactionClient;

/** Số người đã đặt trùng khung giờ (phòng đọc tính theo chỗ ngồi) */
async function overlapping(roomId: number, start: Date, end: Date, excludeId?: number, db: Db = prisma) {
  return db.roomBooking.findMany({
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

export async function validateSlot(room: Room, start: Date, end: Date, people: number, excludeId?: number, db: Db = prisma) {
  if (!matchShift(start, end)) {
    throw badRequest(`Chỉ mượn phòng theo ca: ${ROOM_SHIFTS.map((s) => `${s.start}h–${s.end}h`).join(", ")}`);
  }
  if (end.getTime() <= Date.now()) throw badRequest("Ca này đã kết thúc, vui lòng chọn ca khác");
  const clash = await overlapping(room.id, start, end, excludeId, db);
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
  const s = await getSettings();

  // Kiểm tra trùng và tạo lượt đặt trong CÙNG một giao dịch, có khóa theo bạn đọc và theo phòng.
  // Hai người bấm đặt cùng phòng, cùng ca, cùng lúc: người sau phải chờ người trước xong,
  // rồi mới kiểm tra lại, nên chỉ một người đặt được.
  return prisma.$transaction(
    async (tx) => {
      await acquireLock(tx, `booking-reader-${readerId}`); // khóa theo thứ tự cố định: bạn đọc rồi tới phòng
      await acquireLock(tx, `booking-room-${room.id}`);
      await validateSlot(room, input.startTime, input.endTime, input.people, undefined, tx);
      const mine = await tx.roomBooking.count({
        where: {
          readerId,
          status: { in: BOOKING_BLOCKING },
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
      });
      if (mine) throw badRequest("Bạn đã có một lượt đặt phòng khác trùng khung giờ");
      return tx.roomBooking.create({
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
    },
    { timeout: 20000 },
  );
}

/**
 * Khóa ứng dụng của SQL Server (sp_getapplock), tự nhả khi giao dịch kết thúc.
 * Chờ tối đa 10 giây; quá thời gian thì báo người dùng thử lại.
 */
async function acquireLock(tx: Db, resource: string) {
  const rows = await tx.$queryRaw<Array<{ result: number }>>`
    DECLARE @result int;
    EXEC @result = sp_getapplock @Resource = ${resource}, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    SELECT @result AS result;`;
  if (!rows.length || rows[0].result < 0) throw conflict("Hệ thống đang xử lý một lượt đặt khác cho phòng này, vui lòng thử lại");
}

/** Lịch đặt phòng trong ngày (dùng cho trang tình trạng phòng) */
export async function bookingsOfDay(day: Date) {
  return prisma.roomBooking.findMany({
    where: { startTime: { gte: startOfDay(day), lte: endOfDay(day) }, status: { in: [...BOOKING_BLOCKING, "COMPLETED"] } },
    orderBy: { startTime: "asc" },
  });
}
