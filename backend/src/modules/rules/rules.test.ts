import { describe, expect, it } from "vitest";
import {
  borrowBlockReason,
  calcReturnFine,
  cardExpiry,
  commission,
  loanDueAt,
  matchShift,
  inspectRoom,
  overlaps,
  roomChecklist,
  renewBlockReason,
  renewedDueAt,
  slotBlockReason,
} from "./rules";

const S = { FINE_PER_DAY: 2000, DAMAGE_FINE: 50000, LOST_FINE: 200000, MAX_RENEWALS: 1, RENEW_DAYS: 3, CARD_VALID_DAYS: 2190, BLOCK_IF_UNPAID: 1 };
const d = (y: number, m: number, day: number, h = 10, min = 0) => new Date(y, m - 1, day, h, min);

describe("RB08 – Tiền phạt khi trả sách", () => {
  it("trả đúng hạn (cùng ngày hết hạn) không bị phạt", () => {
    expect(calcReturnFine(d(2026, 10, 10, 23, 59), d(2026, 10, 10, 18), "GOOD", S)).toEqual({ daysLate: 0, lateFine: 0, extraFine: 0, total: 0 });
  });
  it("trả trễ 3 ngày: 3 × 2.000 = 6.000 đ", () => {
    expect(calcReturnFine(d(2026, 10, 10, 23, 59), d(2026, 10, 13, 8), "GOOD", S).total).toBe(6000);
  });
  it("làm hỏng sách cộng 50.000 đ", () => {
    const r = calcReturnFine(d(2026, 10, 10), d(2026, 10, 12), "DAMAGED", S);
    expect(r).toMatchObject({ daysLate: 2, lateFine: 4000, extraFine: 50000, total: 54000 });
  });
  it("làm mất sách phạt 200.000 đ", () => {
    expect(calcReturnFine(d(2026, 10, 10), d(2026, 10, 9), "LOST", S).total).toBe(200000);
  });
});

describe("RB07 – Gia hạn sách", () => {
  const item = { returnedAt: null, dueAt: d(2026, 10, 15, 23, 59), renewCount: 0, loanType: "HOME" };
  const ok = { now: d(2026, 10, 13), waitingOthers: 0, cardStatus: "ACTIVE" };
  it("đủ điều kiện thì được gia hạn", () => expect(renewBlockReason(item, ok, S)).toBeNull());
  it("hạn mới = hạn cũ + 3 ngày, cuối ngày", () => {
    const n = renewedDueAt(item.dueAt, S);
    expect([n.getDate(), n.getHours(), n.getMinutes()]).toEqual([18, 23, 59]);
  });
  it("không gia hạn sách đọc tại chỗ", () => expect(renewBlockReason({ ...item, loanType: "ONSITE" }, ok, S)).toMatch(/tại chỗ/));
  it("không gia hạn sách đã quá hạn", () => expect(renewBlockReason(item, { ...ok, now: d(2026, 10, 16) }, S)).toMatch(/quá hạn/));
  it("chỉ gia hạn tối đa 1 lần", () => expect(renewBlockReason({ ...item, renewCount: 1 }, ok, S)).toMatch(/tối đa 1 lần/));
  it("không gia hạn khi có người khác đang chờ", () => expect(renewBlockReason(item, { ...ok, waitingOthers: 1 }, S)).toMatch(/đang chờ/));
  it("không gia hạn khi thẻ bị khóa", () => expect(renewBlockReason(item, { ...ok, cardStatus: "LOCKED" }, S)).toMatch(/Thẻ/));
});

describe("RB02–RB04 – Điều kiện mượn sách", () => {
  const ctx = { userActive: true, readerStatus: "ACTIVE", cardStatus: "ACTIVE", unpaid: 0, overdue: 0, activeHome: 2, maxBooks: 5, addCount: 1, loanType: "HOME" as const };
  it("bạn đọc hợp lệ được mượn", () => expect(borrowBlockReason(ctx, S)).toBeNull());
  it("thẻ hết hạn bị chặn", () => expect(borrowBlockReason({ ...ctx, cardStatus: "EXPIRED" }, S)).toMatch(/hết hạn/));
  it("còn nợ phạt bị chặn", () => expect(borrowBlockReason({ ...ctx, unpaid: 1 }, S)).toMatch(/chưa nộp phạt/));
  it("không chặn nợ phạt nếu tắt quy định BLOCK_IF_UNPAID", () => expect(borrowBlockReason({ ...ctx, unpaid: 1 }, { BLOCK_IF_UNPAID: 0 })).toBeNull());
  it("có sách quá hạn bị chặn", () => expect(borrowBlockReason({ ...ctx, overdue: 1 }, S)).toMatch(/quá hạn/));
  it("vượt hạn mức 5 cuốn bị chặn", () => expect(borrowBlockReason({ ...ctx, activeHome: 4, addCount: 2 }, S)).toMatch(/Vượt hạn mức/));
  it("đọc tại chỗ không tính hạn mức", () => expect(borrowBlockReason({ ...ctx, activeHome: 5, loanType: "ONSITE" }, S)).toBeNull());
});

describe("Hạn phiếu mượn", () => {
  it("mượn về nhà: hôm nay + 14 ngày", () => expect(loanDueAt("HOME", d(2026, 10, 1), 14).getDate()).toBe(15));
  it("đọc tại chỗ: cuối ngày hôm nay", () => {
    const due = loanDueAt("ONSITE", d(2026, 10, 1, 9), 14);
    expect([due.getDate(), due.getHours()]).toEqual([1, 23]);
  });
});

describe("RB01 – Thẻ thư viện (thẻ sinh viên) hạn 6 năm", () => {
  it("MSSV khóa 23 hết hạn khoảng 01/09/2029", () => {
    const e = cardExpiry("2001230172", "STUDENT", d(2026, 10, 1), 2190);
    expect([e.getFullYear(), e.getMonth() + 1]).toEqual([2029, 8]);
  });
  it("giảng viên tính từ ngày tạo", () => expect(cardExpiry("GV0001", "LECTURER", d(2026, 1, 1), 2190).getFullYear()).toBe(2031));
});

describe("RB11 – Mượn phòng theo ca", () => {
  it("đúng ca 13h–15h", () => expect(matchShift(d(2026, 10, 14, 13), d(2026, 10, 14, 15))?.label).toBe("Ca 3 (13h–15h)"));
  it("giờ lẻ 10h–12h không phải ca", () => expect(matchShift(d(2026, 10, 14, 10), d(2026, 10, 14, 12))).toBeUndefined());
  it("khung qua trưa 11h–13h không hợp lệ", () => expect(matchShift(d(2026, 10, 14, 11), d(2026, 10, 14, 13))).toBeUndefined());
  it("phát hiện trùng giờ", () => expect(overlaps(d(2026, 10, 14, 13), d(2026, 10, 14, 15), d(2026, 10, 14, 14), d(2026, 10, 14, 16))).toBe(true));
  it("hai ca liền kề không trùng", () => expect(overlaps(d(2026, 10, 14, 7), d(2026, 10, 14, 9), d(2026, 10, 14, 9), d(2026, 10, 14, 11))).toBe(false));
  const group = { roomType: "GROUP", capacity: 6, status: "AVAILABLE" };
  it("phòng nhóm đã có lượt trong ca thì từ chối", () => expect(slotBlockReason(group, 4, [{ people: 3 }])).toMatch(/đã có người đặt/));
  it("vượt sức chứa thì từ chối", () => expect(slotBlockReason(group, 8, [])).toMatch(/6 chỗ/));
  it("phòng đọc còn chỗ thì cho đặt", () => expect(slotBlockReason({ roomType: "READING", capacity: 10, status: "AVAILABLE" }, 3, [{ people: 6 }])).toBeNull());
  it("phòng đọc hết chỗ thì từ chối", () => expect(slotBlockReason({ roomType: "READING", capacity: 10, status: "AVAILABLE" }, 5, [{ people: 6 }])).toMatch(/còn 4 chỗ/));
});

describe("Hoa hồng theo khoa", () => {
  it("khoa CNTT bán 1.000.000 đ × 5% = 50.000 đ", () => expect(commission(1_000_000, 5)).toBe(50000));
  it("tỉ lệ lẻ được làm tròn", () => expect(commission(333_333, 2.5)).toBe(8333));
});

describe("Kiểm tra tình trạng phòng khi trả phòng", () => {
  const S2 = { ROOM_DAMAGE_FINE: 100000, ROOM_LOST_FINE: 300000 };
  it("danh mục gồm thiết bị của phòng và các mục chung, không trùng", () =>
    expect(roomChecklist("bảng trắng, Màn hình TV, bàn, ghế")).toEqual(["Bảng trắng", "Màn hình TV", "Bàn", "Ghế", "Bàn, ghế", "Ổ điện, đèn, quạt / máy lạnh", "Vệ sinh phòng"]));
  it("mọi thứ bình thường thì phòng tốt, không phạt", () => {
    const r = inspectRoom([{ name: "Bảng trắng", state: "OK" }, { name: "Vệ sinh phòng", state: "OK" }], S2);
    expect([r.condition, r.total, r.issues.length]).toEqual(["GOOD", 0, 0]);
  });
  it("hư hỏng không nhập tiền thì lấy mức gợi ý 100.000 đ", () => {
    const r = inspectRoom([{ name: "Màn hình TV", state: "DAMAGED", note: "vỡ góc" }], S2);
    expect([r.condition, r.total]).toEqual(["ISSUE", 100000]);
    expect(r.summary).toContain("Màn hình TV hư hỏng (vỡ góc)");
  });
  it("cộng tiền nhiều mục, thủ thư được nhập mức phạt riêng", () =>
    expect(inspectRoom([{ name: "Điều khiển máy lạnh", state: "LOST" }, { name: "Ghế", state: "DAMAGED", fee: 50000 }, { name: "Bảng trắng", state: "OK", fee: 999 }], S2).total).toBe(350000));
});
