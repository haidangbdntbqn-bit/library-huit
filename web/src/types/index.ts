export type Role = "READER" | "LIBRARIAN" | "ADMIN";

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Faculty {
  id: number;
  code: string;
  name: string;
  commissionRate: string | number;
  majors?: Array<{ id: number; code: string; name: string }>;
}

export interface Major {
  id: number;
  code: string;
  name: string;
  facultyId?: number | null;
  faculty?: Pick<Faculty, "id" | "code" | "name"> | null;
}

export interface LibraryCard {
  id: number;
  readerId: number;
  cardNumber?: string | null;
  status: "ACTIVE" | "LOCKED" | "EXPIRED";
  requestedAt: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  note?: string | null;
  reader?: Reader;
}

export interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Reader {
  id: number;
  userId: number;
  studentCode: string;
  readerType: string;
  majorId?: number | null;
  major?: Major | null;
  className?: string | null;
  status: "ACTIVE" | "SUSPENDED";
  maxBooks: number;
  createdAt: string;
  user?: UserInfo;
  card?: LibraryCard | null;
  activeLoans?: number;
  unpaidViolations?: number;
  unpaidAmount?: number;
  _count?: { violations: number };
  loans?: Loan[];
  violations?: Violation[];
  bookings?: RoomBooking[];
}

export interface Staff {
  id: number;
  userId: number;
  staffCode: string;
  position: string;
  hiredAt?: string | null;
  user: UserInfo;
  _count?: { loans: number };
}

export interface Me extends UserInfo {
  reader?: Reader | null;
  staff?: Staff | null;
}

export interface CopySummary {
  total: number;
  available: number;
  onsiteAvailable: number;
  borrowed: number;
  reserved: number;
}

export interface Book {
  id: number;
  code: string;
  title: string;
  author: string;
  publisher?: string | null;
  publishYear?: number | null;
  isbn?: string | null;
  docType: "GIAO_TRINH" | "TLTK";
  majorId?: number | null;
  major?: Major | null;
  shelf?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  createdAt: string;
  copiesSummary?: CopySummary;
}

export interface BookCopy {
  id: number;
  barcode: string;
  bookId: number;
  book?: Book;
  status: string;
  onsiteOnly: boolean;
  condition: string;
  import?: { code: string; importedAt: string } | null;
  liquidation?: { code: string; createdAt: string } | null;
  loanItems?: Array<LoanItem & { loan: Loan }>;
}

export interface LoanItem {
  id: number;
  loanId: number;
  copyId: number;
  copy: BookCopy & { book: Book };
  dueAt: string;
  renewCount: number;
  returnedAt?: string | null;
  returnCondition?: string | null;
  fine: string | number;
}

export interface Loan {
  id: number;
  code: string;
  readerId: number;
  reader?: Reader & { user: { fullName: string } };
  staff?: { user: { fullName: string } } | null;
  loanType: "HOME" | "ONSITE";
  status: "BORROWING" | "RETURNED";
  note?: string | null;
  borrowedAt: string;
  items: LoanItem[];
  isOverdue?: boolean;
  openItems?: number;
}

export interface BorrowRequest {
  id: number;
  readerId: number;
  bookId: number;
  loanType: "HOME" | "ONSITE";
  copy?: { id: number; barcode: string; status: string } | null;
  status: string;
  note?: string | null;
  pickupBefore?: string | null;
  createdAt: string;
  book: Pick<Book, "id" | "code" | "title" | "author" | "shelf">;
  reader?: Reader & { user: { fullName: string } };
}

export interface Violation {
  id: number;
  readerId: number;
  type: "LATE" | "DAMAGED" | "LOST" | "OTHER";
  description: string;
  fineAmount: string | number;
  status: "UNPAID" | "PAID" | "WAIVED";
  createdAt: string;
  resolvedAt?: string | null;
  reader?: Reader & { user: { fullName: string } };
}

export interface RoomSlot {
  startTime: string;
  endTime: string;
  status: string;
  people: number;
  mine?: boolean;
}

export interface Shift {
  start: number;
  end: number;
  label: string;
}

export interface Notice {
  key: string;
  level: "danger" | "warning" | "info" | "success";
  title: string;
  message: string;
  link: string;
  at: string;
}

export interface FacultyStat {
  facultyId: number | null;
  code: string;
  faculty: string;
  rate: number;
  readers: number;
  loans: number;
  groupBookings: number;
  readingBookings: number;
  materialSales: number;
  bookSales: number;
  revenue: number;
  commission: number;
}

export interface Room {
  id: number;
  code: string;
  name: string;
  roomType: "READING" | "GROUP";
  capacity: number;
  floor?: string | null;
  equipment?: string | null;
  status: "AVAILABLE" | "MAINTENANCE";
  currentState?: "AVAILABLE" | "IN_USE" | "RESERVED" | "MAINTENANCE";
  schedule?: RoomSlot[];
  freeSeats?: number;
}

export interface RoomBooking {
  id: number;
  code: string;
  roomId: number;
  room: Room;
  readerId: number;
  reader?: Reader & { user: { fullName: string; phone?: string | null } };
  startTime: string;
  endTime: string;
  people: number;
  purpose?: string | null;
  status: string;
  note?: string | null;
  createdAt: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  /** Kết quả kiểm tra phòng khi trả: GOOD | ISSUE */
  roomCondition?: "GOOD" | "ISSUE" | null;
  /** JSON danh sách RoomInspectItem */
  inspection?: string | null;
  damageFee?: string | number | null;
  inspectedBy?: string | null;
}

export type InspectState = "OK" | "DAMAGED" | "LOST";
export interface RoomInspectItem {
  name: string;
  state: InspectState;
  fee?: number | null;
  note?: string | null;
}

export interface Material {
  id: number;
  code: string;
  title: string;
  lecturer?: string | null;
  majorId?: number | null;
  major?: Major | null;
  category: "BAI_GIANG" | "GIAO_TRINH" | "SACH_THAM_KHAO";
  format: "PRINT" | "DIGITAL";
  price: string | number;
  stock: number;
  description?: string | null;
  isActive: boolean;
}

export interface Order {
  id: number;
  code: string;
  readerId: number;
  reader?: Reader & { user: { fullName: string } };
  totalAmount: string | number;
  paymentMethod: "CASH" | "TRANSFER";
  status: "PENDING" | "PAID" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  paidAt?: string | null;
  items: Array<{ id: number; quantity: number; unitPrice: string | number; material: Pick<Material, "code" | "title" | "format"> }>;
}

export interface Settings {
  values: Record<string, number>;
  labels: Record<string, string>;
}

export interface ChatMessage {
  from: "user" | "bot";
  text: string;
  buttons?: Array<{ title: string; payload: string }>;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  username?: string | null;
  role?: string | null;
  action: string;
  method: string;
  path: string;
  status: number;
  detail?: string | null;
  ip?: string | null;
  createdAt: string;
  user?: { id: number; username: string; fullName: string } | null;
}
