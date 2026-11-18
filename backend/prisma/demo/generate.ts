/**
 * Sinh dữ liệu demo mô phỏng khoảng 14 tháng hoạt động của thư viện.
 * Hàm generate() không truy cập CSDL, chỉ trả về dữ liệu thuần (liên kết bằng mã),
 * nên có thể chạy thử và kiểm tra tính nhất quán độc lập.
 * Dùng bộ sinh số ngẫu nhiên cố định (seed) để mọi thành viên có cùng dữ liệu.
 */
import {
  FACULTIES, CHAT_SAMPLES, DEM_NAM, DEM_NU, GENERAL_GT, GENERAL_TK, HO, MAJORS, PUBLISHERS, PURPOSES, ROOM_DEFS, STAFF_DEFS, TEN_NAM, TEN_NU,
} from "./catalog";

// ---------------- tiện ích ngẫu nhiên ----------------
let _s = 20260917;
function rnd(): number {
  _s |= 0; _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p: number) => rnd() < p;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
function weighted<T>(items: T[], w: (x: T) => number): T {
  const total = items.reduce((s, x) => s + w(x), 0);
  let r = rnd() * total;
  for (const x of items) { r -= w(x); if (r <= 0) return x; }
  return items[items.length - 1];
}
function poisson(l: number): number {
  const L = Math.exp(-l); let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}
const pad = (n: number, w: number) => String(n).padStart(w, "0");

// ---------------- tiện ích ngày giờ ----------------
const DAY = 86400000;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
const atTime = (d: Date, h: number, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
const startOfDay = (d: Date) => atTime(d, 0, 0);
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 0); return x; };
const ymd = (d: Date) => `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
const randomTime = (d: Date, fromH: number, toH: number) => addMin(atTime(d, fromH), int(0, (toH - fromH) * 60));
const daysLate = (due: Date, at: Date) => Math.max(0, Math.round((startOfDay(at).getTime() - startOfDay(due).getTime()) / DAY));

/** Ngày thư viện đóng cửa: Chủ nhật, Tết, lễ */
function isClosed(d: Date): boolean {
  if (d.getDay() === 0) return true;
  const md = `${d.getMonth() + 1}-${d.getDate()}`;
  if (["1-1", "4-30", "5-1", "9-2"].includes(md)) return true;
  const t = d.getTime();
  const tet = [[new Date(2025, 0, 25), new Date(2025, 1, 3)], [new Date(2026, 1, 12), new Date(2026, 1, 23)]];
  return tet.some(([a, b]) => t >= a.getTime() && t < b.getTime());
}
// hệ số theo mùa (tháng 0-11): mùa thi cao, hè thấp
const LOAN_SEASON = [1.0, 0.7, 1.0, 1.05, 1.3, 1.2, 0.35, 0.4, 0.9, 1.0, 1.1, 1.35];
const ROOM_SEASON = [0.45, 0.3, 0.5, 0.55, 0.7, 0.6, 0.12, 0.15, 0.4, 0.5, 0.6, 0.7];
const ORDER_SEASON = [1.0, 2.2, 2.0, 0.8, 0.6, 0.5, 0.3, 1.4, 3.0, 1.5, 0.8, 0.7];

// ---------------- kiểu dữ liệu đầu ra ----------------
export interface Out {
  faculties: typeof FACULTIES;
  majors: Array<{ code: string; name: string; facultyCode: string }>;
  users: Array<{ username: string; fullName: string; email: string | null; phone: string | null; role: string; isActive: boolean; createdAt: Date; pw: "admin" | "staff" | "reader" | "demo" }>;
  staff: Array<{ username: string; staffCode: string; position: string; hiredAt: Date }>;
  readers: Array<{ username: string; studentCode: string; readerType: string; majorCode: string | null; className: string | null; status: string; maxBooks: number; createdAt: Date }>;
  cards: Array<{ studentCode: string; cardNumber: string | null; status: string; requestedAt: Date; issuedAt: Date | null; expiresAt: Date | null; note: string | null }>;
  books: Array<{ code: string; title: string; author: string; publisher: string; publishYear: number; isbn: string | null; docType: string; majorCode: string | null; shelf: string; description: string; createdAt: Date }>;
  imports: Array<{ code: string; staffCode: string; supplier: string; totalCost: number; note: string; importedAt: Date }>;
  liquidations: Array<{ code: string; staffCode: string; reason: string; createdAt: Date }>;
  copies: Array<{ barcode: string; bookCode: string; status: string; onsiteOnly: boolean; condition: string; importCode: string; liquidationCode: string | null; createdAt: Date }>;
  loans: Array<{ code: string; studentCode: string; staffCode: string; loanType: string; status: string; borrowedAt: Date; note: string | null }>;
  items: Array<{ loanCode: string; barcode: string; dueAt: Date; renewCount: number; returnedAt: Date | null; returnCondition: string | null; fine: number }>;
  violations: Array<{ studentCode: string; loanCode: string | null; barcode: string | null; type: string; description: string; fineAmount: number; status: string; createdAt: Date; resolvedAt: Date | null }>;
  requests: Array<{ studentCode: string; bookCode: string; loanType: string; copyBarcode: string | null; status: string; note: string | null; pickupBefore: Date | null; createdAt: Date; handledAt: Date | null }>;
  rooms: typeof ROOM_DEFS;
  bookings: Array<{ code: string; roomCode: string; studentCode: string; startTime: Date; endTime: Date; people: number; purpose: string; status: string; note: string | null; createdAt: Date; checkedInAt: Date | null; checkedOutAt: Date | null }>;
  materials: Array<{ code: string; title: string; lecturer: string; majorCode: string | null; category: string; format: string; price: number; stock: number; description: string; isActive: boolean; createdAt: Date }>;
  orders: Array<{ code: string; studentCode: string; totalAmount: number; paymentMethod: string; status: string; createdAt: Date; paidAt: Date | null }>;
  orderItems: Array<{ orderCode: string; materialCode: string; quantity: number; unitPrice: number }>;
  chats: Array<{ username: string | null; sessionId: string; message: string; reply: string; createdAt: Date }>;
}

// ---------------- trạng thái mô phỏng ----------------
interface R {
  username: string; studentCode: string; majorCode: string | null; type: string; maxBooks: number; activity: number;
  issuedAt: Date | null; expiresAt: Date | null; cardStatus: string; lockedAt: Date | null;
  items: Array<{ type: string; from: number; ret: number; due: number }>;
  blocks: Array<[number, number]>; bookings: Array<[number, number]>; fixed?: boolean;
}
interface C { barcode: string; bookCode: string; onsite: boolean; from: number; freeAt: number; broken: null | { at: number; kind: string }; noLend: boolean; liq: string | null; open: boolean; reserved?: boolean }
interface B { code: string; majorCode: string | null; docType: string; pop: number; copies: C[]; created: number }

function personName(): string {
  const male = chance(0.47);
  return `${pick(HO)} ${pick(male ? DEM_NAM : DEM_NU)} ${pick(male ? TEN_NAM : TEN_NU)}`;
}
function phone(): string {
  return `0${pick(["90", "93", "97", "98", "32", "33", "35", "36", "37", "38", "39", "70", "76", "77", "78", "79", "81", "83", "84", "85", "86", "88", "89"])}${pad(int(0, 9999999), 7)}`;
}
function isbn13(): string {
  const d = `978604${pad(int(0, 999999), 6)}`;
  const sum = [...d].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0);
  return d + ((10 - (sum % 10)) % 10);
}

export function generate(now = new Date()): Out {
  _s = 20260917;
  const NOW = now.getTime();
  const simStart = startOfDay(new Date(now.getFullYear() - 1, now.getMonth() - 2, 1));
  const out: Out = {
    faculties: FACULTIES,
    majors: MAJORS.map((m) => ({ code: m.code, name: m.name, facultyCode: m.faculty })),
    users: [], staff: [], readers: [], cards: [], books: [], imports: [], liquidations: [], copies: [], loans: [], items: [],
    violations: [], requests: [], rooms: ROOM_DEFS, bookings: [], materials: [], orders: [], orderItems: [], chats: [],
  };

  // ======== nhân viên ========
  STAFF_DEFS.forEach((s, i) => {
    const hired = new Date(2012 + i, int(0, 11), int(1, 28));
    out.users.push({ username: s.username, fullName: s.fullName, email: `${s.username.replace(".", "")}@library.example.edu.vn`, phone: phone(), role: s.role, isActive: true, createdAt: hired, pw: s.role === "ADMIN" && s.username === "admin" ? "admin" : "staff" });
    out.staff.push({ username: s.username, staffCode: s.staffCode, position: s.position, hiredAt: hired });
  });
  const circStaff = ["NV001", "NV001", "NV003", "NV003", "NV004"];

  // ======== bạn đọc ========
  const readers: R[] = [];
  const usedCodes = new Set(["2001230000", "2001230001", "2001230172", "2001230605", "2001230427"]);
  const addReader = (o: {
    username: string; studentCode: string; fullName: string; type: string; majorCode: string | null; className: string | null; maxBooks: number;
    requestedAt: Date; cardStatus: string; issuedAt: Date | null; note?: string | null; pw?: "reader" | "demo"; activity?: number; fixed?: boolean;
    expBase?: Date; // mốc tính hạn thẻ: ngày nhập học (sinh viên)
  }) => {
    // Thẻ sinh viên dùng làm thẻ thư viện: hạn 6 năm (2190 ngày) tính từ năm nhập học
    const expiresAt = o.issuedAt ? addDays(o.expBase ?? o.issuedAt, 2190) : null;
    let cardStatus = o.cardStatus;
    if (cardStatus === "ACTIVE" && expiresAt && expiresAt.getTime() < NOW) cardStatus = "EXPIRED";
    let lockedAt: Date | null = null;
    let note = o.note ?? null;
    if (cardStatus === "ACTIVE" && !o.fixed && chance(0.015)) {
      cardStatus = "LOCKED"; lockedAt = new Date(NOW - int(5, 90) * DAY); note = "Làm mất sách chưa bồi thường";
    }
    out.users.push({ username: o.username, fullName: o.fullName, email: `${o.username}@student.example.edu.vn`, phone: chance(0.8) ? phone() : null, role: "READER", isActive: true, createdAt: o.requestedAt, pw: o.pw ?? "reader" });
    out.readers.push({ username: o.username, studentCode: o.studentCode, readerType: o.type, majorCode: o.majorCode, className: o.className, status: cardStatus === "LOCKED" ? "SUSPENDED" : "ACTIVE", maxBooks: o.maxBooks, createdAt: o.requestedAt });
    out.cards.push({ studentCode: o.studentCode, cardNumber: o.issuedAt ? `TV${o.studentCode}` : null, status: cardStatus, requestedAt: o.requestedAt, issuedAt: o.issuedAt, expiresAt, note });
    const r: R = { username: o.username, studentCode: o.studentCode, majorCode: o.majorCode, type: o.type, maxBooks: o.maxBooks, activity: o.activity ?? 0.2 + Math.pow(rnd(), 3) * 5,
      issuedAt: o.issuedAt, expiresAt, cardStatus, lockedAt, items: [], blocks: [], bookings: [], fixed: o.fixed };
    readers.push(r);
    return r;
  };

  // tài khoản demo cố định
  const demo = addReader({ username: "sinhvien", studentCode: "2001230000", fullName: "Nguyễn Văn Sinh Viên", type: "STUDENT", majorCode: "CNTT", className: "14DHTH01", maxBooks: 5,
    requestedAt: new Date(2023, 8, 10, 9, 0), cardStatus: "ACTIVE", issuedAt: new Date(2023, 8, 10, 9, 0), expBase: new Date(2023, 8, 1), pw: "demo", fixed: true, activity: 0 });
  const demo2 = addReader({ username: "sinhvien2", studentCode: "2001230001", fullName: "Lê Thị Thu Hà", type: "STUDENT", majorCode: "KT", className: "14DHKT02", maxBooks: 5,
    requestedAt: new Date(2023, 8, 12, 9, 0), cardStatus: "ACTIVE", issuedAt: new Date(2023, 8, 12, 9, 0), expBase: new Date(2023, 8, 1), pw: "demo", fixed: true, activity: 0 });

  const COHORT: Record<number, number> = { 20: 25, 21: 50, 22: 70, 23: 95, 24: 95, 25: 85, 26: 45 };
  for (const [yyS, count] of Object.entries(COHORT)) {
    const yy = Number(yyS);
    for (let i = 0; i < count; i++) {
      let code: string;
      do code = `2001${yy}${pad(int(2, 2999), 4)}`; while (usedCodes.has(code));
      usedCodes.add(code);
      const m = weighted(MAJORS, (x) => x.weight);
      const className = `${yy - 9}DH${m.cls}${pad(int(1, Math.max(2, Math.round(m.weight / 2))), 2)}`;
      const enrol = new Date(2000 + yy, 8, int(5, 25), int(8, 17), int(0, 59));
      // Khóa mới (26) vừa đăng ký trong tháng: thẻ kích hoạt ngay, không cần duyệt
      const req = yy === 26 ? new Date(Math.min(NOW - int(1, 18) * DAY, Math.max(enrol.getTime(), NOW - 20 * DAY))) : enrol;
      addReader({ username: code, studentCode: code, fullName: personName(), type: "STUDENT", majorCode: m.code, className, maxBooks: 5, requestedAt: req, cardStatus: "ACTIVE",
        issuedAt: req, expBase: new Date(2000 + yy, 8, 1) });
    }
  }
  for (let i = 1; i <= 26; i++) {
    const m = pick(MAJORS);
    const issued = new Date(2024, int(0, 8), int(1, 28), 9);
    addReader({ username: `gv${pad(i, 4)}`, studentCode: `GV${pad(i, 4)}`, fullName: `${chance(0.5) ? "ThS." : "TS."} ${personName()}`, type: "LECTURER", majorCode: m.code, className: null, maxBooks: 10,
      requestedAt: issued, cardStatus: "ACTIVE", issuedAt: issued, activity: 0.3 + rnd() * 1.5 });
  }
  for (let i = 1; i <= 6; i++) {
    const issued = new Date(2023, int(0, 11), int(1, 28), 9);
    addReader({ username: `cb${pad(i, 4)}`, studentCode: `CB${pad(i, 4)}`, fullName: personName(), type: "STAFF", majorCode: null, className: null, maxBooks: 5,
      requestedAt: issued, cardStatus: "ACTIVE", issuedAt: issued, activity: 0.2 });
  }

  // ======== đầu sách, nhập sách ========
  const books: B[] = [];
  const firstYear = () => weighted([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], (y) => ({ 2019: 5, 2020: 3, 2021: 3, 2022: 3, 2023: 3, 2024: 3, 2025: 3, 2026: 2 } as Record<number, number>)[y]);
  const importDate = (year: number, half: 0 | 1) => new Date(year, half ? 7 : 1, half ? int(10, 20) : int(24, 28), 9, 30);
  type Line = { book: B; qty: number; price: number; onsite: number };
  const slips = new Map<string, Line[]>();
  const addLine = (year: number, half: 0 | 1, l: Line) => {
    const d = importDate(year, half);
    if (d.getTime() > NOW) return false;
    const key = `${year}-${half}`;
    if (!slips.has(key)) slips.set(key, []);
    slips.get(key)!.push(l);
    return true;
  };
  const addBook = (title: string, docType: string, majorCode: string | null, shelfArea: string, idx: number, pop: number) => {
    const prefix = docType === "GIAO_TRINH" ? "GT" : "TK";
    const code = `${prefix}-${majorCode ?? "CHUNG"}-${pad(idx, 3)}`;
    let year = firstYear(); let half: 0 | 1 = chance(0.5) ? 1 : 0;
    if (importDate(year, half).getTime() > NOW) { year = 2025; half = 1; }
    const b: B = { code, majorCode, docType, pop, copies: [], created: importDate(year, half).getTime() };
    books.push(b);
    const faculty = MAJORS.find((m) => m.code === majorCode)?.name;
    const author = docType === "GIAO_TRINH" && chance(0.55) ? `${chance(0.5) ? "TS." : "ThS."} ${personName()} (chủ biên)` : `${personName()}${chance(0.4) ? `, ${personName()}` : ""}`;
    out.books.push({
      code, title, author, publisher: pick(PUBLISHERS), publishYear: Math.max(2010, year - int(0, 4)), isbn: chance(0.85) ? isbn13() : null, docType, majorCode,
      shelf: `${shelfArea}-${pad(int(1, 12), 2)}`,
      description: docType === "GIAO_TRINH" ? `Giáo trình học phần ${title}${faculty ? ` dành cho sinh viên ngành ${faculty}` : " dùng chung cho sinh viên các ngành"}.` : `Tài liệu tham khảo về ${title.toLowerCase()}.`,
      createdAt: new Date(b.created),
    });
    const qty = docType === "GIAO_TRINH" ? (majorCode ? int(4, 10) : int(8, 14)) : int(2, 5);
    addLine(year, half, { book: b, qty, price: docType === "GIAO_TRINH" ? int(6, 18) * 5000 : int(10, 70) * 5000, onsite: qty >= 3 ? 1 : 0 });
    if (docType === "GIAO_TRINH" && chance(0.3) && year < 2026) {
      const y2 = int(year + 1, Math.min(2026, year + 4)) as number;
      addLine(y2, chance(0.5) ? 1 : 0, { book: b, qty: int(2, 4), price: int(6, 18) * 5000, onsite: 0 });
    }
  };
  MAJORS.forEach((m) => {
    m.gt.forEach((t, i) => addBook(t, "GIAO_TRINH", m.code, m.shelf, i + 1, 3 + rnd() * 3));
    m.tk.forEach((t, i) => addBook(t, "TLTK", m.code, m.shelf, i + 1, 0.6 + rnd()));
  });
  GENERAL_GT.forEach((t, i) => addBook(t, "GIAO_TRINH", null, "D2", i + 1, 2 + rnd() * 2));
  GENERAL_TK.forEach((t, i) => addBook(t, "TLTK", null, "D2", 20 + i + 1, 0.5 + rnd()));

  const suppliers = ["Công ty Sách và Thiết bị trường học TP. HCM", "Nhà sách Phương Nam", "Công ty CP Sách Đại học – Dạy nghề", "Fahasa – Chi nhánh doanh nghiệp", "Tài trợ của cựu sinh viên"];
  const sortedKeys = [...slips.keys()].sort((a, b) => importDate(Number(a.split("-")[0]), Number(a.split("-")[1]) as 0 | 1).getTime() - importDate(Number(b.split("-")[0]), Number(b.split("-")[1]) as 0 | 1).getTime());
  const copyByBarcode = new Map<string, C>();
  sortedKeys.forEach((key, idx) => {
    const [y, h] = key.split("-").map(Number);
    const date = importDate(y, h as 0 | 1);
    const code = `PN-${ymd(date)}-${pad(idx + 1, 4)}`;
    const lines = slips.get(key)!;
    out.imports.push({ code, staffCode: "NV005", supplier: pick(suppliers), totalCost: lines.reduce((s, l) => s + l.qty * l.price, 0), note: `Bổ sung tài liệu ${h ? "học kỳ I" : "học kỳ II"} năm ${y}`, importedAt: date });
    lines.forEach((l) => {
      for (let i = 0; i < l.qty; i++) {
        const barcode = `${l.book.code}-${pad(l.book.copies.length + 1, 3)}`;
        const c: C = { barcode, bookCode: l.book.code, onsite: i >= l.qty - l.onsite, from: date.getTime(), freeAt: 0, broken: null, noLend: false, liq: null, open: false };
        l.book.copies.push(c);
        copyByBarcode.set(barcode, c);
        out.copies.push({ barcode, bookCode: l.book.code, status: "AVAILABLE", onsiteOnly: c.onsite, condition: y <= 2020 ? "Cũ, còn sử dụng được" : "Tốt", importCode: code, liquidationCode: null, createdAt: date });
      }
    });
  });

  // phiếu thanh lý: bản cũ nhập 2019 (không cho mượn trong mô phỏng) + bản hư hỏng
  const liqSlips = [new Date(2025, 11, 15, 10), new Date(2026, 5, 20, 10)].filter((d) => d.getTime() < NOW).map((d, i) => ({ code: `TL-${ymd(d)}-${pad(i + 1, 4)}`, date: d }));
  liqSlips.forEach((s, i) => out.liquidations.push({ code: s.code, staffCode: "NV005", reason: i === 0 ? "Thanh lý sách cũ nát, lạc hậu và sách hư hỏng không thể phục hồi cuối năm 2025" : "Thanh lý sách hư hỏng, rách nát học kỳ II năm học 2025–2026", createdAt: s.date }));
  if (liqSlips.length) {
    const old = books.flatMap((b) => b.copies).filter((c) => new Date(c.from).getFullYear() === 2019 && !c.onsite);
    for (let i = 0; i < Math.min(28, old.length); i++) {
      const c = pick(old);
      if (c.noLend) continue;
      c.noLend = true; c.liq = pick(liqSlips).code;
    }
  }

  // ======== mô phỏng mượn trả ========
  const loanItemsOf = new Map<string, number>();
  let loanSeq = 0;
  const vio = (r: R, loanCode: string, barcode: string, type: string, desc: string, amount: number, at: Date) => {
    const age = (NOW - at.getTime()) / DAY;
    let status = "PAID"; let resolved: Date | null = null;
    const roll = rnd();
    if (age > 45) status = roll < 0.88 ? "PAID" : roll < 0.96 ? "WAIVED" : "UNPAID";
    else if (age > 7) status = roll < 0.7 ? "PAID" : "UNPAID";
    else status = roll < 0.45 ? "PAID" : "UNPAID";
    if (status !== "UNPAID") {
      resolved = status === "PAID" && chance(0.6) ? addMin(at, int(1, 30)) : addDays(at, int(1, 10));
      if (resolved.getTime() > NOW) resolved = new Date(NOW - 60000);
    }
    out.violations.push({ studentCode: r.studentCode, loanCode, barcode, type, description: desc, fineAmount: amount, status, createdAt: at, resolvedAt: resolved });
    r.blocks.push([at.getTime(), resolved ? resolved.getTime() : Infinity]);
  };
  const eligible = (r: R, t: number, n: number, type: string) => {
    if (!r.issuedAt || r.issuedAt.getTime() > t || !r.expiresAt || r.expiresAt.getTime() <= t) return false;
    if (r.cardStatus === "PENDING" || r.cardStatus === "REJECTED") return false;
    if (r.lockedAt && r.lockedAt.getTime() <= t) return false;
    if (r.blocks.some(([a, b]) => a <= t && t < b)) return false;
    if (r.items.some((i) => i.due < t && i.ret > t)) return false;
    if (type === "HOME") {
      const active = r.items.filter((i) => i.type === "HOME" && i.from <= t && t < i.ret).length;
      if (active + n > r.maxBooks) return false;
    }
    return true;
  };
  const freeCopy = (b: B, t: number, type: string) => {
    const ok = b.copies.filter((c) => !c.noLend && !c.broken && c.from <= t && c.freeAt <= t && (type === "ONSITE" || !c.onsite));
    if (!ok.length) return null;
    const pref = type === "ONSITE" ? ok.filter((c) => c.onsite) : ok;
    return pick(pref.length ? pref : ok);
  };
  type Outcome = "normal" | "ontime" | "late" | "open";
  const makeLoan = (r: R, t: Date, type: string, bookList: B[], forced?: { outcome: Outcome; lateDays?: number; dueIn?: number }) => {
    const copies: C[] = [];
    for (const b of bookList) { const c = freeCopy(b, t.getTime(), type); if (c && !copies.includes(c)) copies.push(c); }
    if (!copies.length || !eligible(r, t.getTime(), copies.length, type)) return null;
    loanSeq++;
    const code = `PM-${ymd(t)}-${loanSeq.toString(36).toUpperCase().padStart(4, "0")}`;
    let allReturned = true;
    for (const c of copies) {
      let due: Date; let renew = 0; let ret: Date | null; let cond = "GOOD";
      if (type === "ONSITE") {
        due = endOfDay(t);
        ret = addMin(t, int(60, 240));
        if (ret.getHours() >= 20) ret = atTime(t, 20, 0);
      } else {
        due = endOfDay(addDays(t, 14));
        if (forced?.dueIn !== undefined) due = endOfDay(new Date(NOW + forced.dueIn * DAY));
        else if (chance(0.12) && !forced) { renew = 1; due = endOfDay(addDays(due, 3)); }
        const o = forced?.outcome ?? "normal";
        if (o === "open") ret = null;
        else if (o === "ontime") ret = randomTime(addDays(t, int(3, 12)), 8, 19);
        else if (o === "late") ret = randomTime(addDays(due, forced?.lateDays ?? 3), 8, 19);
        else {
          const roll = rnd();
          if (roll < 0.7) ret = randomTime(addDays(t, int(1, Math.max(1, Math.round((due.getTime() - t.getTime()) / DAY) - 1))), 8, 19);
          else if (roll < 0.76) ret = randomTime(due, 8, 19);
          else if (roll < 0.96) ret = randomTime(addDays(due, 1 + Math.floor(rnd() * rnd() * 20)), 8, 19);
          else ret = randomTime(addDays(due, int(21, 60)), 8, 19);
        }
        if (ret && !forced) { const x = rnd(); if (x < 0.01) cond = "DAMAGED"; else if (x < 0.014) cond = "LOST"; }
      }
      if (ret && ret.getTime() > NOW) ret = null;
      if (!ret) allReturned = false;
      const late = ret ? daysLate(due, ret) : 0;
      const extra = cond === "DAMAGED" ? 50000 : cond === "LOST" ? 200000 : 0;
      out.items.push({ loanCode: code, barcode: c.barcode, dueAt: due, renewCount: renew, returnedAt: ret, returnCondition: ret ? cond : null, fine: late * 2000 + extra });
      loanItemsOf.set(code, (loanItemsOf.get(code) ?? 0) + 1);
      r.items.push({ type, from: t.getTime(), ret: ret ? ret.getTime() : Infinity, due: due.getTime() });
      c.freeAt = ret ? ret.getTime() : Infinity;
      c.open = !ret;
      if (ret && cond !== "GOOD") { c.broken = { at: ret.getTime(), kind: cond }; c.freeAt = Infinity; }
      const title = out.books.find((b) => b.code === c.bookCode)!.title;
      if (ret && late > 0) vio(r, code, c.barcode, "LATE", `Trả trễ ${late} ngày: ${title}`, late * 2000, ret);
      if (ret && cond === "DAMAGED") vio(r, code, c.barcode, "DAMAGED", `Làm hỏng sách: ${title} (rách trang, bong gáy)`, extra, ret);
      if (ret && cond === "LOST") vio(r, code, c.barcode, "LOST", `Làm mất sách: ${title}`, extra, ret);
    }
    out.loans.push({ code, studentCode: r.studentCode, staffCode: pick(circStaff), loanType: type, status: allReturned ? "RETURNED" : "BORROWING", borrowedAt: t, note: null });
    return code;
  };
  const bookFor = (r: R): B => {
    const x = rnd();
    const pool = x < 0.65 && r.majorCode ? books.filter((b) => b.majorCode === r.majorCode) : x < 0.85 ? books.filter((b) => !b.majorCode) : books;
    return weighted(pool.length ? pool : books, (b) => b.pop);
  };
  const demoBooks = books.filter((b) => b.majorCode === "CNTT");
  const demoPlan = new Map<string, Array<{ outcome: Outcome; lateDays?: number; dueIn?: number; titleIdx: number }>>();
  [[300, "ontime", 0], [245, "ontime", 3], [190, "late", 5], [130, "ontime", 7], [80, "ontime", 11], [40, "ontime", 12]].forEach(([ago, o, idx]) =>
    demoPlan.set(ymd(new Date(NOW - (ago as number) * DAY)), [{ outcome: o as Outcome, lateDays: 3, titleIdx: idx as number }]));
  const demo2Day = ymd(new Date(NOW - 20 * DAY));
  demoPlan.set(ymd(new Date(NOW - 12 * DAY)), [{ outcome: "open", dueIn: 2, titleIdx: 3 }, { outcome: "open", dueIn: 2, titleIdx: 10 }]);

  const pool = readers.filter((r) => !r.fixed);
  for (let d = new Date(simStart); d.getTime() <= NOW; d = addDays(d, 1)) {
    const plan = demoPlan.get(ymd(d));
    const isDemo2 = ymd(d) === demo2Day;
    if (isClosed(d) && !plan && !isDemo2) continue;
    const f = LOAN_SEASON[d.getMonth()];
    const events: Array<{ t: Date; type: string }> = [];
    for (let i = poisson(11 * f); i > 0; i--) events.push({ t: randomTime(d, 7, 19), type: "HOME" });
    for (let i = poisson(6 * f); i > 0; i--) events.push({ t: randomTime(d, 7, 17), type: "ONSITE" });
    events.sort((a, b) => a.t.getTime() - b.t.getTime());
    if (plan) {
      const t = atTime(d, 9, 30);
      if (t.getTime() < NOW) makeLoan(demo, t, "HOME", plan.map((p) => demoBooks[p.titleIdx % demoBooks.length]), plan[0]);
    }
    if (isDemo2) {
      // sinhvien2: một cuốn quá hạn 6 ngày để demo nhắc nhở quá hạn và chặn mượn
      makeLoan(demo2, atTime(d, 10), "HOME", [books.filter((b) => b.majorCode === "KT")[0]], { outcome: "open", dueIn: -6 });
    }
    for (const e of events) {
      if (e.t.getTime() > NOW) continue;
      const n = e.type === "HOME" ? weighted([1, 2, 3], (k) => [55, 30, 15][k - 1]) : weighted([1, 2], (k) => [75, 25][k - 1]);
      for (let tries = 0; tries < 8; tries++) {
        const r = weighted(pool, (x) => x.activity);
        const list = Array.from({ length: n }, () => bookFor(r));
        if (makeLoan(r, e.t, e.type, list)) break;
      }
    }
  }

  // trạng thái cuối cùng của bản sách
  const liqByCode = new Map(liqSlips.map((s) => [s.code, s.date.getTime()]));
  out.copies.forEach((row) => {
    const c = copyByBarcode.get(row.barcode)!;
    if (c.noLend && c.liq) { row.status = "LIQUIDATED"; row.liquidationCode = c.liq; return; }
    if (c.open) { row.status = "BORROWED"; return; }
    if (c.reserved) { row.status = "RESERVED"; return; }
    if (c.broken) {
      const slip = liqSlips.find((s) => s.date.getTime() > c.broken!.at && c.broken!.kind === "DAMAGED");
      if (slip) { row.status = "LIQUIDATED"; row.liquidationCode = slip.code; row.condition = "Hư hỏng"; return; }
      row.status = c.broken.kind; row.condition = c.broken.kind === "DAMAGED" ? "Rách trang, bong gáy" : "Bạn đọc làm mất";
    }
  });
  void liqByCode;

  // ======== yêu cầu mượn trực tuyến ========
  const recentHome = out.loans.filter((l) => l.loanType === "HOME" && NOW - l.borrowedAt.getTime() < 60 * DAY && l.studentCode !== demo.studentCode);
  recentHome.filter(() => chance(0.25)).forEach((l) => {
    const it = out.items.find((i) => i.loanCode === l.code)!;
    const created = new Date(l.borrowedAt.getTime() - int(4, 40) * 3600000);
    out.requests.push({ studentCode: l.studentCode, bookCode: copyByBarcode.get(it.barcode)!.bookCode, loanType: "HOME", copyBarcode: it.barcode, status: "FULFILLED", note: null, pickupBefore: addDays(created, 2), createdAt: created, handledAt: l.borrowedAt });
  });
  const activeNow = pool.filter((r) => eligible(r, NOW, 1, "HOME"));
  // Bản sách rảnh lúc hiện tại (để giữ cho yêu cầu đã soạn sách)
  const freeNow = (b: B, type: string) => b.copies.find((c) => !c.noLend && !c.broken && !c.reserved && c.freeAt <= NOW && (type === "ONSITE" || !c.onsite));
  const availableBooks = books.filter((b) => freeNow(b, "HOME"));
  const reqSpec: Array<[string, number]> = [["PENDING", 9], ["READY", 6], ["CANCELLED", 7], ["REJECTED", 3]];
  const reqUsed = new Set<string>();
  reqSpec.forEach(([status, n]) => {
    for (let i = 0; i < n; i++) {
      const r = pick(activeNow); const b = pick(availableBooks);
      const key = `${r.studentCode}|${b.code}`;
      if (reqUsed.has(key)) continue;
      reqUsed.add(key);
      const created = new Date(NOW - (status === "PENDING" ? int(1, 40) * 3600000 : int(1, 6) * DAY));
      const loanType = chance(0.15) ? "ONSITE" : "HOME";
      const held = status === "READY" ? freeNow(b, loanType) : undefined;
      if (status === "READY" && !held) continue;
      if (held) held.reserved = true;
      out.requests.push({ studentCode: r.studentCode, bookCode: b.code, loanType, copyBarcode: held?.barcode ?? null, status,
        note: status === "REJECTED" ? pick(["Sách đang được bảo quản, tạm ngưng cho mượn", "Bản còn lại chỉ phục vụ đọc tại chỗ"]) : null,
        pickupBefore: status === "READY" ? new Date(NOW + int(1, 2) * DAY) : null, createdAt: created,
        handledAt: status === "PENDING" ? null : new Date(Math.min(NOW - 60000, created.getTime() + int(2, 20) * 3600000)) });
    }
  });
  const demoReady = demoBooks.find((b) => freeNow(b, "HOME") && !out.items.some((i) => i.returnedAt === null && copyByBarcode.get(i.barcode)!.bookCode === b.code && out.loans.find((l) => l.code === i.loanCode)!.studentCode === demo.studentCode));
  const demoHeld = demoReady ? freeNow(demoReady, "HOME") : undefined;
  if (demoHeld) demoHeld.reserved = true;
  if (demoReady && demoHeld) out.requests.push({ studentCode: demo.studentCode, bookCode: demoReady.code, loanType: "HOME", copyBarcode: demoHeld.barcode, status: "READY", note: null, pickupBefore: new Date(NOW + DAY), createdAt: new Date(NOW - 20 * 3600000), handledAt: new Date(NOW - 3 * 3600000) });
  // bản sách đang giữ cho yêu cầu đã soạn sách
  out.copies.forEach((row) => { if (copyByBarcode.get(row.barcode)!.reserved && row.status === "AVAILABLE") row.status = "RESERVED"; });

  // ======== mượn phòng ========
  let bookingSeq = 0;
  const roomSlots = new Map<string, Array<[number, number]>>();
  const overlaps = (list: Array<[number, number]>, a: number, b: number) => list.some(([x, y]) => x < b && a < y);
  const addBooking = (roomCode: string, r: R, s: Date, e: Date, people: number, forcedStatus?: string) => {
    const a = s.getTime(), b = e.getTime();
    if (overlaps(r.bookings, a, b)) return false;
    const room = ROOM_DEFS.find((x) => x.code === roomCode)!;
    const slots = roomSlots.get(roomCode) ?? [];
    if (room.roomType === "GROUP" && overlaps(slots, a, b)) return false;
    bookingSeq++;
    let status: string; let note: string | null = null; let cin: Date | null = null; let cout: Date | null = null;
    if (forcedStatus) status = forcedStatus;
    else if (b <= NOW) {
      const x = rnd();
      status = x < 0.86 ? "COMPLETED" : x < 0.93 ? "CANCELLED" : x < 0.97 ? "REJECTED" : "CANCELLED";
      if (status === "REJECTED") note = pick(["Phòng bảo trì thiết bị", "Trùng lịch sinh hoạt của khoa", "Số người vượt sức chứa"]);
      if (status === "CANCELLED" && x >= 0.97) note = "Không đến nhận phòng";
    } else if (a <= NOW) status = "IN_USE";
    else status = a - NOW < DAY ? (chance(0.7) ? "APPROVED" : "PENDING") : chance(0.5) ? "APPROVED" : "PENDING";
    if (status === "COMPLETED" || status === "IN_USE") cin = addMin(s, int(0, 10));
    if (status === "COMPLETED") cout = addMin(e, -int(0, 15));
    const created = new Date(Math.min(a - int(1, 72) * 3600000, NOW - int(1, 120) * 60000));
    out.bookings.push({ code: `DP-${ymd(s)}-${bookingSeq.toString(36).toUpperCase().padStart(4, "0")}`, roomCode, studentCode: r.studentCode, startTime: s, endTime: e, people,
      purpose: pick(PURPOSES), status, note, createdAt: created, checkedInAt: cin, checkedOutAt: cout });
    if (!["CANCELLED", "REJECTED"].includes(status)) { slots.push([a, b]); roomSlots.set(roomCode, slots); r.bookings.push([a, b]); }
    return true;
  };
  const cardOk = (r: R, t: number) => !!r.issuedAt && r.issuedAt.getTime() <= t && !!r.expiresAt && r.expiresAt.getTime() > t && !["PENDING", "REJECTED"].includes(r.cardStatus) && !(r.lockedAt && r.lockedAt.getTime() <= t);

  // Phòng mượn theo 4 ca cố định: 7–9, 9–11, 13–15, 15–17
  const SHIFTS: Array<[number, number]> = [[7, 9], [9, 11], [13, 15], [15, 17]];
  // lịch cố định của tài khoản demo
  const demoDays = [[-35, "P302", 9, 11], [-9, "P304", 13, 15], [1, "P301", 13, 15]] as const;
  demoDays.forEach(([off, room, h1, h2]) => {
    let d = addDays(startOfDay(now), off);
    while (isClosed(d)) d = addDays(d, off < 0 ? -1 : 1);
    addBooking(room, demo, atTime(d, h1), atTime(d, h2), 5, off < 0 ? "COMPLETED" : "APPROVED");
  });
  const bookingEnd = addDays(startOfDay(now), 8);
  for (let d = new Date(simStart); d < bookingEnd; d = addDays(d, 1)) {
    if (isClosed(d)) continue;
    const season = ROOM_SEASON[d.getMonth()] * (d.getTime() > NOW ? 0.6 : 1);
    for (const [h1, h2] of SHIFTS) {
      const s = atTime(d, h1), e = atTime(d, h2);
      for (const room of ROOM_DEFS) {
        if (room.roomType === "GROUP") {
          if (!chance(Math.min(0.95, season * 1.25) * (room.code === "P401" ? 0.5 : 1))) continue;
          const people = int(Math.min(3, room.capacity), room.capacity);
          for (let k = 0; k < 6; k++) {
            const r = weighted(pool, (x) => x.activity + 0.3);
            if (r.type === "LECTURER" || !cardOk(r, Math.min(s.getTime() - 3600000, NOW))) continue;
            if (addBooking(room.code, r, s, e, people)) break;
          }
        } else if (room.code === "PD2") {
          for (let i = poisson(3 * season); i > 0; i--) {
            const r = weighted(pool, (x) => x.activity + 0.3);
            if (r.type === "LECTURER" || !cardOk(r, Math.min(s.getTime(), NOW))) continue;
            addBooking("PD2", r, s, e, int(1, 3));
          }
        } else if (chance(0.12)) {
          const r = pick(pool.filter((x) => x.type === "LECTURER"));
          if (cardOk(r, Math.min(s.getTime(), NOW))) addBooking(room.code, r, s, e, 1);
        }
      }
    }
  }

  // ======== tài liệu bài giảng và đơn hàng ========
  // Nhà sách thư viện: tài liệu bài giảng + giáo trình + sách tham khảo bán cho sinh viên
  let matIdx = 0;
  MAJORS.forEach((m) => {
    m.gt.slice(0, m.weight >= 10 ? 4 : 3).forEach((t) => {
      matIdx++;
      const digital = chance(0.2);
      out.materials.push({ code: `BG-${m.code}-${pad(matIdx, 3)}${digital ? "-PDF" : ""}`, title: `Bài giảng ${t}${digital ? " (bản PDF)" : ""}`, lecturer: `${chance(0.5) ? "ThS." : "TS."} ${personName()}`,
        majorCode: m.code, category: "BAI_GIANG", format: digital ? "DIGITAL" : "PRINT", price: digital ? int(10, 25) * 1000 : int(18, 60) * 1000, stock: 0,
        description: `Tài liệu bài giảng học phần ${t}, ngành ${m.name}.`, isActive: true, createdAt: new Date(2024, 7, int(1, 20)) });
    });
    m.gt.forEach((t) => {
      matIdx++;
      out.materials.push({ code: `GT-BAN-${m.code}-${pad(matIdx, 3)}`, title: `Giáo trình ${t}`, lecturer: `${chance(0.5) ? "TS." : "ThS."} ${personName()} (chủ biên)`,
        majorCode: m.code, category: "GIAO_TRINH", format: "PRINT", price: int(9, 30) * 5000, stock: 0,
        description: `Giáo trình học phần ${t} do khoa biên soạn, ${pick(PUBLISHERS)} phát hành.`, isActive: true, createdAt: new Date(2024, 7, int(1, 25)) });
    });
    m.tk.slice(0, 3).forEach((t) => {
      matIdx++;
      out.materials.push({ code: `TK-BAN-${m.code}-${pad(matIdx, 3)}`, title: t, lecturer: `${personName()}`,
        majorCode: m.code, category: "SACH_THAM_KHAO", format: "PRINT", price: int(16, 70) * 5000, stock: 0,
        description: `Sách tham khảo về ${t.toLowerCase()}, ${pick(PUBLISHERS)}.`, isActive: true, createdAt: new Date(2025, 1, int(1, 25)) });
    });
  });
  ["Đề cương ôn tập Triết học Mác – Lênin", "Bài tập Xác suất thống kê", "Tài liệu ôn thi Tiếng Anh đầu ra"].forEach((t, i) =>
    out.materials.push({ code: `BG-CHUNG-${pad(i + 1, 3)}`, title: t, lecturer: `ThS. ${personName()}`, majorCode: null, category: "BAI_GIANG", format: "PRINT", price: int(15, 35) * 1000, stock: 0,
      description: `${t} dùng chung cho sinh viên các ngành.`, isActive: true, createdAt: new Date(2024, 7, 5) }));
  const sold = new Map<string, number>();
  let orderSeq = 0;
  const addOrder = (r: R, at: Date, mats: typeof out.materials, forced?: string) => {
    orderSeq++;
    const code = `DH-${ymd(at)}-${orderSeq.toString(36).toUpperCase().padStart(4, "0")}`;
    const age = (NOW - at.getTime()) / DAY;
    let status = forced ?? "";
    if (!status) {
      const x = rnd();
      if (age > 5) status = x < 0.88 ? "COMPLETED" : x < 0.97 ? "CANCELLED" : age < 30 ? "PAID" : "COMPLETED";
      else status = x < 0.5 ? "PENDING" : x < 0.75 ? "PAID" : x < 0.95 ? "COMPLETED" : "CANCELLED";
    }
    let total = 0;
    mats.forEach((m) => {
      const q = m.format === "PRINT" && chance(0.1) ? 2 : 1;
      total += q * m.price;
      out.orderItems.push({ orderCode: code, materialCode: m.code, quantity: q, unitPrice: m.price });
      if (status !== "CANCELLED" && m.format === "PRINT") sold.set(m.code, (sold.get(m.code) ?? 0) + q);
    });
    const paidAt = ["PAID", "COMPLETED"].includes(status) ? new Date(Math.min(NOW - 60000, at.getTime() + int(10, 72 * 60) * 60000)) : null;
    out.orders.push({ code, studentCode: r.studentCode, totalAmount: total, paymentMethod: chance(0.65) ? "CASH" : "TRANSFER", status, createdAt: at, paidAt });
  };
  const studentPool = pool.filter((r) => r.type === "STUDENT");
  for (let d = new Date(simStart); d.getTime() <= NOW; d = addDays(d, 1)) {
    if (isClosed(d)) continue;
    for (let i = poisson(1.6 * ORDER_SEASON[d.getMonth()]); i > 0; i--) {
      const at = randomTime(d, 7, 19); if (at.getTime() > NOW) continue;
      const r = pick(studentPool); if (!cardOk(r, at.getTime())) continue;
      const own = out.materials.filter((m) => m.majorCode === r.majorCode);
      const list = [...new Set(Array.from({ length: weighted([1, 2, 3], (k) => [60, 30, 10][k - 1]) }, () => (chance(0.8) && own.length ? pick(own) : pick(out.materials))))];
      addOrder(r, at, list);
    }
  }
  const demoMats = out.materials.filter((m) => m.majorCode === "CNTT");
  addOrder(demo, new Date(NOW - 50 * DAY), demoMats.slice(0, 2), "COMPLETED");
  addOrder(demo, new Date(NOW - 5 * 3600000), demoMats.slice(2, 3).length ? demoMats.slice(2, 3) : demoMats.slice(0, 1), "PENDING");
  // tồn kho hiện tại: bản in còn lại sau khi bán (không âm), bản số không quản lý tồn
  out.materials.forEach((m) => { m.stock = m.format === "PRINT" ? int(6, 60) : 0; });
  void sold;

  // ======== nhật ký chatbot ========
  const chatUsers = pool.filter((r) => cardOk(r, NOW)).slice(0, 80);
  for (let i = 0; i < 180; i++) {
    const [q, a] = pick(CHAT_SAMPLES);
    const at = new Date(NOW - int(1, 60 * 24 * 60) * 60000);
    const u = chance(0.7) ? pick(chatUsers) : null;
    out.chats.push({ username: u?.username ?? null, sessionId: u ? `user-${u.username}` : `guest-${Math.floor(rnd() * 1e8).toString(36)}`, message: q, reply: a, createdAt: at });
  }
  return out;
}
