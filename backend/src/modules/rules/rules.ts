/**
 * Quy tắc nghiệp vụ thuần (không truy cập CSDL) – dùng chung cho các service
 * và được kiểm thử tự động bằng Vitest (src/modules/rules/rules.test.ts).
 */
import { addDays, daysLate, endOfDay } from "../../utils/date";

export interface RuleSettings {
  FINE_PER_DAY: number;
  DAMAGE_FINE: number;
  LOST_FINE: number;
  MAX_RENEWALS: number;
  RENEW_DAYS: number;
  CARD_VALID_DAYS: number;
  BLOCK_IF_UNPAID: number | boolean;
}

export type ReturnCondition = "GOOD" | "DAMAGED" | "LOST";

/** RB08 – Tiền phạt khi trả: số ngày trễ × đơn giá + phạt hỏng / mất */
export function calcReturnFine(dueAt: Date, returnedAt: Date, condition: ReturnCondition, s: Pick<RuleSettings, "FINE_PER_DAY" | "DAMAGE_FINE" | "LOST_FINE">) {
  const late = daysLate(dueAt, returnedAt);
  const lateFine = late * s.FINE_PER_DAY;
  const extraFine = condition === "DAMAGED" ? s.DAMAGE_FINE : condition === "LOST" ? s.LOST_FINE : 0;
  return { daysLate: late, lateFine, extraFine, total: lateFine + extraFine };
}

/** RB07 – Điều kiện gia hạn: trả về lý do từ chối, hoặc null nếu được gia hạn */
export function renewBlockReason(
  item: { returnedAt: Date | null; dueAt: Date; renewCount: number; loanType: string },
  ctx: { now: Date; waitingOthers: number; cardStatus?: string | null },
  s: Pick<RuleSettings, "MAX_RENEWALS">,
): string | null {
  if (item.returnedAt) return "Sách đã được trả";
  if (item.loanType !== "HOME") return "Sách đọc tại chỗ không gia hạn được";
  if (daysLate(item.dueAt, ctx.now) > 0) return "Sách đã quá hạn, vui lòng mang trả tại quầy";
  if (item.renewCount >= s.MAX_RENEWALS) return `Đã gia hạn tối đa ${s.MAX_RENEWALS} lần`;
  if (ctx.waitingOthers > 0) return "Có bạn đọc khác đang chờ mượn đầu sách này nên không thể gia hạn";
  if (ctx.cardStatus !== "ACTIVE") return "Thẻ mượn không còn hiệu lực";
  return null;
}

/** Hạn trả mới sau khi gia hạn: cuối ngày (hạn cũ + RENEW_DAYS) */
export const renewedDueAt = (dueAt: Date, s: Pick<RuleSettings, "RENEW_DAYS">) => endOfDay(addDays(dueAt, s.RENEW_DAYS));

/** RB02–RB04 – Điều kiện mượn: trả về lý do từ chối, hoặc null nếu được mượn */
export function borrowBlockReason(
  ctx: {
    userActive: boolean;
    readerStatus: string;
    cardStatus?: string | null;
    unpaid: number;
    overdue: number;
    activeHome: number;
    maxBooks: number;
    addCount: number;
    loanType: "HOME" | "ONSITE";
  },
  s: Pick<RuleSettings, "BLOCK_IF_UNPAID">,
): string | null {
  if (!ctx.userActive) return "Tài khoản bạn đọc đã bị khóa";
  if (ctx.readerStatus !== "ACTIVE") return "Bạn đọc đang bị tạm ngưng quyền mượn";
  if (ctx.cardStatus !== "ACTIVE") {
    const reason = !ctx.cardStatus ? "chưa có thẻ thư viện" : ctx.cardStatus === "EXPIRED" ? "thẻ đã hết hạn" : "thẻ đang bị khóa";
    return `Không thể mượn: ${reason}`;
  }
  if (s.BLOCK_IF_UNPAID && ctx.unpaid > 0) return `Bạn đọc còn ${ctx.unpaid} vi phạm chưa nộp phạt`;
  if (ctx.overdue > 0) return `Bạn đọc đang có ${ctx.overdue} cuốn quá hạn chưa trả`;
  if (ctx.loanType === "HOME" && ctx.activeHome + ctx.addCount > ctx.maxBooks) return `Vượt hạn mức: đang mượn ${ctx.activeHome}/${ctx.maxBooks} cuốn`;
  return null;
}

/** Hạn phiếu mượn: về nhà = cuối ngày (hôm nay + LOAN_DAYS); tại chỗ = cuối ngày hôm nay */
export const loanDueAt = (loanType: "HOME" | "ONSITE", now: Date, loanDays: number) => endOfDay(loanType === "HOME" ? addDays(now, loanDays) : now);

/** RB01 – Hạn thẻ: sinh viên tính từ 1/9 năm nhập học (MSSV 2001YYxxxx) + thời hạn; còn lại tính từ ngày tạo */
export function cardExpiry(studentCode: string, readerType: string, now: Date, validDays: number) {
  const m = /^\d{4}(\d{2})\d{4}$/.exec(studentCode);
  const start = readerType === "STUDENT" && m ? new Date(2000 + Number(m[1]), 8, 1) : now;
  return addDays(start, validDays);
}

/** RB11 – Ca mượn phòng cố định (phòng hoạt động 7h–17h) */
export const ROOM_SHIFTS: Array<{ start: number; end: number; label: string }> = [
  { start: 7, end: 9, label: "Ca 1 (7h–9h)" },
  { start: 9, end: 11, label: "Ca 2 (9h–11h)" },
  { start: 13, end: 15, label: "Ca 3 (13h–15h)" },
  { start: 15, end: 17, label: "Ca 4 (15h–17h)" },
];

/** Trả về ca nếu [start, end) khớp đúng một ca trong cùng ngày */
export function matchShift(start: Date, end: Date) {
  if (start.toDateString() !== end.toDateString()) return undefined;
  if (start.getMinutes() || end.getMinutes()) return undefined;
  return ROOM_SHIFTS.find((s) => s.start === start.getHours() && s.end === end.getHours());
}

/** Hai khoảng thời gian [a1,a2) và [b1,b2) có giao nhau không */
export const overlaps = (a1: Date, a2: Date, b1: Date, b2: Date) => a1 < b2 && b1 < a2;

/** RB11 – Kiểm tra sức chứa / trùng ca: trả về lý do từ chối hoặc null */
export function slotBlockReason(
  room: { roomType: string; capacity: number; status: string },
  people: number,
  clash: Array<{ people: number }>,
): string | null {
  if (room.status !== "AVAILABLE") return "Phòng đang bảo trì";
  if (people > room.capacity) return `Phòng chỉ có ${room.capacity} chỗ`;
  if (room.roomType === "GROUP" && clash.length) return "Ca này của phòng đã có người đặt";
  if (room.roomType === "READING") {
    const used = clash.reduce((sum, b) => sum + b.people, 0);
    if (used + people > room.capacity) return `Phòng đọc chỉ còn ${room.capacity - used} chỗ trong ca này`;
  }
  return null;
}

/** Hoa hồng bán sách, tài liệu cho khoa (làm tròn đồng) */
export const commission = (revenue: number, ratePercent: number) => Math.round((revenue * ratePercent) / 100);

// ---------- Kiểm tra tình trạng phòng khi trả phòng ----------

export type InspectState = "OK" | "DAMAGED" | "LOST";
export interface InspectItem {
  name: string;
  state: InspectState;
  fee?: number | null;
  note?: string | null;
}

const BASE_CHECKLIST = ["Bàn, ghế", "Ổ điện, đèn, quạt / máy lạnh", "Vệ sinh phòng"];

/** Danh mục kiểm tra khi trả phòng: thiết bị khai báo của phòng + các mục chung */
export function roomChecklist(equipment?: string | null): string[] {
  const own = (equipment ?? "")
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  const seen = new Set<string>();
  return [...own, ...BASE_CHECKLIST].filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const STATE_TEXT: Record<InspectState, string> = { OK: "bình thường", DAMAGED: "hư hỏng", LOST: "bị mất" };

/**
 * Tổng hợp kết quả kiểm tra phòng: mục nào hư hỏng / mất thì tính phạt
 * (thủ thư nhập số tiền; bỏ trống thì lấy mức gợi ý trong Cài đặt).
 */
export function inspectRoom(items: InspectItem[], s: { ROOM_DAMAGE_FINE: number; ROOM_LOST_FINE: number }) {
  const checked = items.map((i) => {
    const fee = i.state === "OK" ? 0 : Math.max(0, Math.round(i.fee ?? (i.state === "LOST" ? s.ROOM_LOST_FINE : s.ROOM_DAMAGE_FINE)));
    return { name: i.name.trim(), state: i.state, fee, note: i.note?.trim() || null };
  });
  const issues = checked.filter((i) => i.state !== "OK");
  const total = issues.reduce((sum, i) => sum + i.fee, 0);
  const summary = issues.length
    ? `Kiểm tra khi trả phòng: ${issues.map((i) => `${i.name} ${STATE_TEXT[i.state]}${i.note ? ` (${i.note})` : ""}`).join("; ")}`
    : "Kiểm tra khi trả phòng: đầy đủ, bình thường";
  return { condition: issues.length ? ("ISSUE" as const) : ("GOOD" as const), items: checked, issues, total, summary };
}
