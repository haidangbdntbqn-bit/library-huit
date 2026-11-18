/**
 * Nạp BỘ DỮ LIỆU DEMO lớn (mô phỏng ~14 tháng hoạt động) vào CSDL.
 * CẢNH BÁO: xóa toàn bộ dữ liệu hiện có trước khi nạp.
 * Chạy: npm run db:seed:demo
 */
process.env.TZ = process.env.TZ || "Asia/Ho_Chi_Minh";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generate } from "./demo/generate";

const prisma = new PrismaClient();

/** createMany theo từng lô để không vượt giới hạn 2100 tham số của SQL Server */
async function insertMany<T extends Record<string, unknown>>(label: string, rows: T[], fn: (data: T[]) => Promise<unknown>) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]).length;
  const size = Math.max(1, Math.floor(1800 / cols));
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
  console.log(`  ${label}: ${rows.length}`);
}
function must<K, V>(map: Map<K, V>, key: K, what: string): V {
  const v = map.get(key);
  if (v === undefined) throw new Error(`Không tìm thấy ${what}: ${String(key)}`);
  return v;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Không chạy dữ liệu demo trên môi trường production");
  const t0 = Date.now();
  console.log("Đang sinh dữ liệu demo...");
  const d = generate(new Date());

  console.log("Xóa dữ liệu cũ...");
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.notificationLog.deleteMany(), prisma.chatLog.deleteMany(), prisma.orderItem.deleteMany(), prisma.order.deleteMany(), prisma.material.deleteMany(),
    prisma.violation.deleteMany(), prisma.roomBooking.deleteMany(), prisma.room.deleteMany(), prisma.loanItem.deleteMany(),
    prisma.loan.deleteMany(), prisma.borrowRequest.deleteMany(), prisma.bookCopy.deleteMany(), prisma.liquidation.deleteMany(),
    prisma.bookImport.deleteMany(), prisma.book.deleteMany(), prisma.libraryCard.deleteMany(), prisma.reader.deleteMany(),
    prisma.staff.deleteMany(), prisma.user.deleteMany(), prisma.setting.deleteMany(), prisma.major.deleteMany(), prisma.faculty.deleteMany(),
  ]);

  console.log("Nạp dữ liệu:");
  const [hAdmin, hStaff, hReader, hDemo] = await Promise.all(["Admin@123", "Thuthu@123", "Docgia@123", "Sinhvien@123"].map((p) => bcrypt.hash(p, 10)));
  const pw = { admin: hAdmin, staff: hStaff, reader: hReader, demo: hDemo };

  await insertMany("khoa", d.faculties.map((f) => ({ ...f })), (data) => prisma.faculty.createMany({ data }));
  const facultyId = new Map((await prisma.faculty.findMany()).map((f) => [f.code, f.id]));
  await insertMany("ngành", d.majors.map((m) => ({ code: m.code, name: m.name, facultyId: must(facultyId, m.facultyCode, "khoa") })), (data) => prisma.major.createMany({ data }));
  const majorId = new Map((await prisma.major.findMany()).map((m) => [m.code, m.id]));
  const mj = (code: string | null) => (code ? must(majorId, code, "ngành") : null);

  await insertMany("tài khoản", d.users.map(({ pw: p, ...u }) => ({ ...u, passwordHash: pw[p] })), (data) => prisma.user.createMany({ data }));
  const userId = new Map((await prisma.user.findMany({ select: { id: true, username: true } })).map((u) => [u.username, u.id]));

  await insertMany("nhân viên", d.staff.map((s) => ({ userId: must(userId, s.username, "tài khoản"), staffCode: s.staffCode, position: s.position, hiredAt: s.hiredAt })),
    (data) => prisma.staff.createMany({ data }));
  const staffId = new Map((await prisma.staff.findMany()).map((s) => [s.staffCode, s.id]));

  await insertMany("bạn đọc", d.readers.map((r) => ({ userId: must(userId, r.username, "tài khoản"), studentCode: r.studentCode, readerType: r.readerType,
    majorId: mj(r.majorCode), className: r.className, status: r.status, maxBooks: r.maxBooks, createdAt: r.createdAt })), (data) => prisma.reader.createMany({ data }));
  const readerId = new Map((await prisma.reader.findMany({ select: { id: true, studentCode: true } })).map((r) => [r.studentCode, r.id]));
  const rd = (code: string) => must(readerId, code, "bạn đọc");

  await insertMany("thẻ mượn", d.cards.map(({ studentCode, ...c }) => ({ ...c, readerId: rd(studentCode) })), (data) => prisma.libraryCard.createMany({ data }));

  await insertMany("đầu sách", d.books.map(({ majorCode, ...b }) => ({ ...b, majorId: mj(majorCode) })), (data) => prisma.book.createMany({ data }));
  const bookId = new Map((await prisma.book.findMany({ select: { id: true, code: true } })).map((b) => [b.code, b.id]));

  await insertMany("phiếu nhập", d.imports.map(({ staffCode, ...x }) => ({ ...x, staffId: must(staffId, staffCode, "nhân viên") })), (data) => prisma.bookImport.createMany({ data }));
  const importId = new Map((await prisma.bookImport.findMany({ select: { id: true, code: true } })).map((x) => [x.code, x.id]));
  await insertMany("phiếu thanh lý", d.liquidations.map(({ staffCode, ...x }) => ({ ...x, staffId: must(staffId, staffCode, "nhân viên") })), (data) => prisma.liquidation.createMany({ data }));
  const liqId = new Map((await prisma.liquidation.findMany({ select: { id: true, code: true } })).map((x) => [x.code, x.id]));

  await insertMany("bản sách", d.copies.map((c) => ({ barcode: c.barcode, bookId: must(bookId, c.bookCode, "đầu sách"), status: c.status, onsiteOnly: c.onsiteOnly,
    condition: c.condition, importId: must(importId, c.importCode, "phiếu nhập"), liquidationId: c.liquidationCode ? must(liqId, c.liquidationCode, "phiếu thanh lý") : null,
    createdAt: c.createdAt })), (data) => prisma.bookCopy.createMany({ data }));
  const copyId = new Map((await prisma.bookCopy.findMany({ select: { id: true, barcode: true } })).map((c) => [c.barcode, c.id]));

  await insertMany("phiếu mượn", d.loans.map((l) => ({ code: l.code, readerId: rd(l.studentCode), staffId: must(staffId, l.staffCode, "nhân viên"), loanType: l.loanType,
    status: l.status, borrowedAt: l.borrowedAt, note: l.note })), (data) => prisma.loan.createMany({ data }));
  const loanId = new Map((await prisma.loan.findMany({ select: { id: true, code: true } })).map((l) => [l.code, l.id]));

  await insertMany("chi tiết mượn", d.items.map((i) => ({ loanId: must(loanId, i.loanCode, "phiếu mượn"), copyId: must(copyId, i.barcode, "bản sách"), dueAt: i.dueAt,
    renewCount: i.renewCount, returnedAt: i.returnedAt, returnCondition: i.returnCondition, fine: i.fine })), (data) => prisma.loanItem.createMany({ data }));
  const itemId = new Map((await prisma.loanItem.findMany({ select: { id: true, loanId: true, copyId: true } })).map((i) => [`${i.loanId}|${i.copyId}`, i.id]));

  await insertMany("vi phạm", d.violations.map((v) => ({ readerId: rd(v.studentCode),
    loanItemId: v.loanCode && v.barcode ? must(itemId, `${must(loanId, v.loanCode, "phiếu mượn")}|${must(copyId, v.barcode, "bản sách")}`, "chi tiết mượn") : null,
    type: v.type, description: v.description, fineAmount: v.fineAmount, status: v.status, createdAt: v.createdAt, resolvedAt: v.resolvedAt })),
    (data) => prisma.violation.createMany({ data }));

  await insertMany("yêu cầu mượn", d.requests.map(({ studentCode, bookCode, copyBarcode, ...r }) => ({ ...r, readerId: rd(studentCode), bookId: must(bookId, bookCode, "đầu sách"),
    copyId: copyBarcode ? must(copyId, copyBarcode, "bản sách") : null })),
    (data) => prisma.borrowRequest.createMany({ data }));

  await insertMany("phòng", d.rooms.map((r) => ({ ...r })), (data) => prisma.room.createMany({ data }));
  const roomId = new Map((await prisma.room.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]));
  await insertMany("lượt mượn phòng", d.bookings.map(({ roomCode, studentCode, ...b }) => ({ ...b, roomId: must(roomId, roomCode, "phòng"), readerId: rd(studentCode) })),
    (data) => prisma.roomBooking.createMany({ data }));

  // Kết quả kiểm tra phòng khi trả: phần lớn bình thường, một số lượt làm hỏng / làm mất đồ đạc
  await prisma.$executeRaw`UPDATE [RoomBooking] SET [roomCondition] = N'GOOD', [inspectedBy] = N'Nguyễn Hoàng Phúc' WHERE [status] = N'COMPLETED'`;
  const DAMAGES = [
    { name: "Màn hình TV", state: "DAMAGED", fee: 500000, note: "Vỡ góc màn hình" },
    { name: "Ghế", state: "DAMAGED", fee: 150000, note: "Gãy chân ghế" },
    { name: "Điều khiển máy lạnh", state: "LOST", fee: 200000, note: null },
    { name: "Bảng trắng", state: "DAMAGED", fee: 80000, note: "Viết bút lông dầu, không xóa được" },
    { name: "Bút trình chiếu", state: "LOST", fee: 250000, note: null },
  ] as const;
  const done = await prisma.roomBooking.findMany({ where: { status: "COMPLETED", room: { roomType: "GROUP" } }, include: { room: true }, orderBy: { id: "asc" } });
  let damaged = 0;
  for (let i = 97; i < done.length; i += 160) {
    const b = done[i];
    const d = DAMAGES[damaged++ % DAMAGES.length];
    const at = b.checkedOutAt ?? b.endTime;
    const old = Date.now() - at.getTime() > 7 * 86400000;
    await prisma.roomBooking.update({
      where: { id: b.id },
      data: {
        roomCondition: "ISSUE",
        inspection: JSON.stringify([{ name: d.name, state: d.state, fee: d.fee, note: d.note }]),
        damageFee: d.fee,
        note: `Kiểm tra khi trả phòng: ${d.name} ${d.state === "LOST" ? "bị mất" : "hư hỏng"}${d.note ? ` (${d.note})` : ""}`,
      },
    });
    await prisma.violation.create({
      data: {
        readerId: b.readerId,
        bookingId: b.id,
        type: d.state,
        description: `${b.room.name} (${b.code}): ${d.name} ${d.state === "LOST" ? "bị mất" : "hư hỏng"}${d.note ? ` – ${d.note}` : ""}`,
        fineAmount: d.fee,
        status: old ? "PAID" : "UNPAID",
        createdAt: at,
        resolvedAt: old ? new Date(at.getTime() + 2 * 86400000) : null,
      },
    });
  }
  console.log(`  kiểm tra phòng: ${done.length} lượt đã trả, ${damaged} lượt có hư hỏng / mất đồ`);

  await insertMany("tài liệu bài giảng", d.materials.map(({ majorCode, ...m }) => ({ ...m, majorId: mj(majorCode) })), (data) => prisma.material.createMany({ data }));
  const matId = new Map((await prisma.material.findMany({ select: { id: true, code: true } })).map((m) => [m.code, m.id]));
  await insertMany("đơn hàng", d.orders.map(({ studentCode, ...o }) => ({ ...o, readerId: rd(studentCode) })), (data) => prisma.order.createMany({ data }));
  const orderId = new Map((await prisma.order.findMany({ select: { id: true, code: true } })).map((o) => [o.code, o.id]));
  await insertMany("chi tiết đơn hàng", d.orderItems.map((o) => ({ orderId: must(orderId, o.orderCode, "đơn hàng"), materialId: must(matId, o.materialCode, "tài liệu"),
    quantity: o.quantity, unitPrice: o.unitPrice })), (data) => prisma.orderItem.createMany({ data }));

  await insertMany("nhật ký chatbot", d.chats.map((c) => {
    const uid = c.username ? must(userId, c.username, "tài khoản") : null;
    return { userId: uid, sessionId: uid ? `user-${uid}` : c.sessionId, message: c.message, reply: c.reply, createdAt: c.createdAt };
  }), (data) => prisma.chatLog.createMany({ data }));

  console.log(`\nHoàn tất sau ${((Date.now() - t0) / 1000).toFixed(1)} giây.`);
  console.log("Tài khoản: admin / Admin@123 | thuthu / Thuthu@123 | sinhvien / Sinhvien@123 (sắp đến hạn trả) | sinhvien2 / Sinhvien@123 (có sách quá hạn)");
  console.log("Nhân viên khác: giamdoc, tt.hoa, tt.phuc, tt.ngan, tt.khoa, tt.yen / Thuthu@123");
  console.log("Bạn đọc khác: đăng nhập bằng MSSV (ví dụ xem ở trang Đọc giả) / Docgia@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
