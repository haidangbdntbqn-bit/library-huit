/**
 * Dữ liệu mẫu để chạy thử. Toàn bộ tên người, số liệu và giá tiền là
 * dữ liệu giả, cần thay bằng dữ liệu khảo sát thực tế khi demo.
 * Chạy: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("CSDL đã có dữ liệu, bỏ qua seed. Dùng `npm run db:reset` nếu muốn tạo lại từ đầu.");
    return;
  }

  const majors = await Promise.all(
    [
      ["CNTT", "Công nghệ thông tin"],
      ["KT", "Kế toán - Kiểm toán"],
      ["QTKD", "Quản trị kinh doanh"],
      ["CNTP", "Công nghệ thực phẩm"],
      ["CNHH", "Công nghệ hóa học"],
      ["TCNH", "Tài chính - Ngân hàng"],
    ].map(([code, name]) => prisma.major.create({ data: { code, name, faculty: { connectOrCreate: { where: { code: `K-${code}` }, create: { code: `K-${code}`, name: `Khoa ${name}`, commissionRate: 5 } } } } })),
  );
  const major = (code: string) => majors.find((m) => m.code === code)!.id;

  const hash = (p: string) => bcrypt.hash(p, 10);
  const now = new Date();

  // Tài khoản mẫu
  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: await hash("Admin@123"),
      fullName: "Quản trị hệ thống",
      role: "ADMIN",
      staff: { create: { staffCode: "NV000", position: "Quản trị hệ thống" } },
    },
  });
  const librarian = await prisma.user.create({
    data: {
      username: "thuthu",
      passwordHash: await hash("Thuthu@123"),
      fullName: "Trần Thị Thủ Thư",
      email: "thuthu@example.com",
      role: "LIBRARIAN",
      staff: { create: { staffCode: "NV001", position: "Thủ thư quầy lưu hành", hiredAt: new Date("2020-09-01") } },
    },
    include: { staff: true },
  });
  const staffId = librarian.staff!.id;

  const readerUser = await prisma.user.create({
    data: {
      username: "sinhvien",
      passwordHash: await hash("Sinhvien@123"),
      fullName: "Nguyễn Văn Sinh Viên",
      email: "sinhvien@example.com",
      phone: "0900000000",
      role: "READER",
      reader: {
        create: {
          studentCode: "2001230000",
          majorId: major("CNTT"),
          className: "14DHTH01",
          card: {
            create: { status: "ACTIVE", cardNumber: "2001230000", issuedAt: now, expiresAt: addDays(new Date(2023, 8, 1), 2190) },
          },
        },
      },
    },
    include: { reader: true },
  });
  const reader2 = await prisma.user.create({
    data: {
      username: "sinhvien2",
      passwordHash: await hash("Sinhvien@123"),
      fullName: "Lê Thị Thu Hà",
      role: "READER",
      reader: { create: { studentCode: "2001230001", majorId: major("KT"), className: "14DHKT02", card: { create: { status: "ACTIVE", cardNumber: "2001230001", issuedAt: now, expiresAt: addDays(new Date(2023, 8, 1), 2190) } } } },
    },
  });
  void reader2;

  // Đầu sách
  const books = [
    ["GT-CNTT-001", "Cơ sở dữ liệu", "Khoa CNTT", "GIAO_TRINH", "CNTT", "C3-04"],
    ["GT-CNTT-002", "Phân tích thiết kế hệ thống thông tin hướng đối tượng", "Phạm Nguyễn Cương và cộng sự", "GIAO_TRINH", "CNTT", "C3-05"],
    ["GT-CNTT-003", "Lập trình Web nâng cao", "Khoa CNTT", "GIAO_TRINH", "CNTT", "C3-06"],
    ["TK-CNTT-001", "Xử lý ngôn ngữ tự nhiên", "Nhiều tác giả", "TLTK", "CNTT", "C4-01"],
    ["TK-CNTT-002", "Trí tuệ nhân tạo", "Nhiều tác giả", "TLTK", "CNTT", "C4-02"],
    ["GT-KT-001", "Nguyên lý kế toán", "Khoa Kế toán", "GIAO_TRINH", "KT", "B2-01"],
    ["TK-KT-001", "Kiểm toán căn bản", "Nhiều tác giả", "TLTK", "KT", "B2-03"],
    ["GT-QT-001", "Marketing căn bản", "Khoa QTKD", "GIAO_TRINH", "QTKD", "B3-01"],
    ["GT-TP-001", "Hóa sinh thực phẩm", "Khoa CNTP", "GIAO_TRINH", "CNTP", "A1-02"],
    ["TK-TP-001", "Vi sinh vật học thực phẩm", "Nhiều tác giả", "TLTK", "CNTP", "A1-05"],
    ["GT-HH-001", "Hóa phân tích", "Khoa CNHH", "GIAO_TRINH", "CNHH", "A2-01"],
    ["GT-TC-001", "Tài chính doanh nghiệp", "Khoa TCNH", "GIAO_TRINH", "TCNH", "B4-01"],
  ];
  const created = [];
  for (const [code, title, author, docType, m, shelf] of books) {
    created.push(
      await prisma.book.create({
        data: { code, title, author, docType, majorId: major(m), shelf, publishYear: 2020 + (created.length % 6), publisher: "NXB mẫu" },
      }),
    );
  }

  // Phiếu nhập: mỗi đầu sách 5 bản, bản cuối chỉ đọc tại chỗ
  const imp = await prisma.bookImport.create({
    data: { code: "PN-SEED-0001", staffId, supplier: "Nhà cung cấp mẫu", note: "Dữ liệu mẫu" },
  });
  for (const b of created) {
    await prisma.bookCopy.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        barcode: `${b.code}-${String(i + 1).padStart(3, "0")}`,
        bookId: b.id,
        importId: imp.id,
        onsiteOnly: i === 4,
      })),
    });
  }

  // Một phiếu mượn đang mở, sắp đến hạn
  const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { barcode: "GT-CNTT-001-001" } });
  await prisma.bookCopy.update({ where: { id: copy.id }, data: { status: "BORROWED" } });
  await prisma.loan.create({
    data: {
      code: "PM-SEED-0001",
      readerId: readerUser.reader!.id,
      staffId,
      loanType: "HOME",
      borrowedAt: addDays(now, -12),
      items: { create: { copyId: copy.id, dueAt: addDays(now, 2) } },
    },
  });

  // Phòng
  const rooms = [
    ["P101", "Phòng học nhóm P.101", "GROUP", 6, "Tầng 1", "Bảng trắng, TV"],
    ["P102", "Phòng học nhóm P.102", "GROUP", 8, "Tầng 1", "Bảng trắng, máy chiếu"],
    ["P103", "Phòng học nhóm P.103", "GROUP", 4, "Tầng 1", "Bảng trắng"],
    ["P104", "Phòng học nhóm P.104", "GROUP", 8, "Tầng 1", "Bảng trắng, TV"],
    ["PD1", "Phòng đọc tầng 1", "READING", 80, "Tầng 1", "Wifi, ổ cắm"],
    ["PD2", "Phòng đọc tầng 2", "READING", 60, "Tầng 2", "Wifi, ổ cắm, máy tính tra cứu"],
  ] as const;
  for (const [code, name, roomType, capacity, floor, equipment] of rooms) {
    await prisma.room.create({ data: { code, name, roomType, capacity, floor, equipment } });
  }

  // Tài liệu bài giảng (giá chỉ là ví dụ)
  await prisma.material.createMany({
    data: [
      { code: "BG-CNPM", title: "Bài giảng Công nghệ phần mềm", lecturer: "Khoa CNTT", majorId: major("CNTT"), price: 30000, stock: 40 },
      { code: "BG-UML", title: "Bài giảng Phân tích thiết kế UML", lecturer: "Khoa CNTT", majorId: major("CNTT"), price: 35000, stock: 25 },
      { code: "BG-KTTC", title: "Bài giảng Kế toán tài chính", lecturer: "Khoa Kế toán", majorId: major("KT"), price: 28000, stock: 30 },
      { code: "BG-CSDL-PDF", title: "Bài giảng Cơ sở dữ liệu (bản PDF)", lecturer: "Khoa CNTT", majorId: major("CNTT"), price: 15000, format: "DIGITAL" },
    ],
  });

  console.log("Đã tạo dữ liệu mẫu.");
  console.log("Tài khoản: admin / Admin@123 | thuthu / Thuthu@123 | sinhvien / Sinhvien@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
