import type {
  Book,
  BookCopy,
  AuditLog,
  Faculty,
  FacultyStat,
  Notice,
  Shift,
  BorrowRequest,
  LibraryCard,
  Loan,
  LoanItem,
  Major,
  Material,
  Me,
  Order,
  Paged,
  Reader,
  Room,
  RoomBooking,
  RoomInspectItem,
  Settings,
  Staff,
  UserInfo,
  Violation,
} from "../types";
import { get, patch, post, put } from "./client";

type Q = Record<string, unknown>;

export const api = {
  auth: {
    login: (username: string, password: string) => post<{ token: string; user: Me }>("/auth/login", { username, password }),
    register: (body: Q) => post<{ token: string; user: Me }>("/auth/register", body),
    me: () => get<Me>("/auth/me"),
    updateMe: (body: Q) => patch<Me>("/auth/me", body),
    changePassword: (body: Q) => post("/auth/change-password", body),
  },
  notifications: {
    mine: () => get<Notice[]>("/notifications/me"),
    sendReminders: () =>
      post<{ smtp: boolean; readers: number; emails: Array<{ to: string | null; name: string; subject: string; items: number; sent: boolean; skipped?: string }> }>(
        "/notifications/send-reminders",
      ),
  },
  auditLogs: {
    list: (q?: Q) => get<Paged<AuditLog>>("/audit-logs", q),
  },
  faculties: {
    list: () => get<Faculty[]>("/faculties"),
    create: (body: Q) => post<Faculty>("/faculties", body),
    update: (id: number, body: Q) => patch<Faculty>(`/faculties/${id}`, body),
  },
  majors: {
    list: () => get<Major[]>("/majors"),
    create: (body: Q) => post<Major>("/majors", body),
    update: (id: number, body: Q) => patch<Major>(`/majors/${id}`, body),
  },
  settings: {
    get: () => get<Settings>("/settings"),
    update: (values: Record<string, number>) => put<Settings>("/settings", values),
  },
  books: {
    list: (q?: Q) => get<Paged<Book>>("/books", q),
    get: (id: number) => get<Book>(`/books/${id}`),
    create: (body: Q) => post<Book>("/books", body),
    update: (id: number, body: Q) => patch<Book>(`/books/${id}`, body),
    copies: (id: number) => get<BookCopy[]>(`/books/${id}/copies`),
  },
  copies: {
    byBarcode: (barcode: string) => get<BookCopy & { book: Book }>(`/copies/barcode/${encodeURIComponent(barcode)}`),
    update: (id: number, body: Q) => patch<BookCopy>(`/copies/${id}`, body),
  },
  imports: {
    list: (q?: Q) => get<Paged<ImportSlip>>("/imports", q),
    get: (id: number) => get<ImportSlip>(`/imports/${id}`),
    create: (body: Q) => post<ImportSlip>("/imports", body),
  },
  liquidations: {
    list: (q?: Q) => get<Paged<LiquidationSlip>>("/liquidations", q),
    get: (id: number) => get<LiquidationSlip>(`/liquidations/${id}`),
    create: (body: Q) => post<LiquidationSlip>("/liquidations", body),
  },
  cards: {
    mine: () => get<LibraryCard | null>("/cards/me"),
    list: (q?: Q) => get<Paged<LibraryCard>>("/cards", q),
    action: (id: number, action: "lock" | "unlock", note?: string) =>
      patch<LibraryCard>(`/cards/${id}/${action}`, { note }),
  },
  readers: {
    list: (q?: Q) => get<Paged<Reader>>("/readers", q),
    get: (id: number) => get<Reader>(`/readers/${id}`),
    lookup: (code: string) => get<Reader>("/readers/lookup", { code }),
    create: (body: Q) => post<Reader>("/readers", body),
    update: (id: number, body: Q) => patch<Reader>(`/readers/${id}`, body),
  },
  violations: {
    mine: () => get<Violation[]>("/violations/me"),
    list: (q?: Q) => get<Paged<Violation>>("/violations", q),
    create: (body: Q) => post<Violation>("/violations", body),
    pay: (id: number) => patch<Violation>(`/violations/${id}/pay`),
    waive: (id: number) => patch<Violation>(`/violations/${id}/waive`),
  },
  loans: {
    mine: () => get<Loan[]>("/loans/me"),
    renew: (itemId: number) => post<LoanItem>(`/loans/items/${itemId}/renew`),
    list: (q?: Q) => get<Paged<Loan>>("/loans", q),
    create: (body: Q) => post<Loan>("/loans", body),
  },
  returns: {
    lookup: (barcode: string) =>
      get<LoanItem & { loan: Loan; daysLate: number; estimatedFine: number }>("/returns/lookup", { barcode }),
    byReader: (code: string) =>
      get<{ reader: Reader & { user: { fullName: string } }; items: Array<LoanItem & { loan: Loan; daysLate: number; estimatedFine: number }> }>(
        "/returns/reader",
        { code },
      ),
    submit: (items: Array<{ barcode: string; condition: string; note?: string }>) =>
      post<{ results: Array<{ barcode: string; title: string; daysLate: number; fine: number; condition: string }> }>(
        "/returns",
        { items },
      ),
  },
  borrowRequests: {
    mine: () => get<BorrowRequest[]>("/borrow-requests/me"),
    create: (bookId: number, loanType: "HOME" | "ONSITE" = "HOME") => post<BorrowRequest>("/borrow-requests", { bookId, loanType }),
    cancel: (id: number) => patch<BorrowRequest>(`/borrow-requests/${id}/cancel`),
    list: (q?: Q) => get<Paged<BorrowRequest>>("/borrow-requests", q),
    ready: (id: number, barcode?: string) => patch<BorrowRequest>(`/borrow-requests/${id}/ready`, barcode ? { barcode } : {}),
    pickup: (code: string) =>
      get<{ loanType: "HOME" | "ONSITE"; dueAt: string; barcodes: string[]; requests: BorrowRequest[] }>("/borrow-requests/pickup", { code }),
    reject: (id: number, note?: string) => patch<BorrowRequest>(`/borrow-requests/${id}/reject`, { note }),
  },
  rooms: {
    list: (q?: Q) => get<Room[]>("/rooms", q),
    shifts: () => get<Shift[]>("/rooms/shifts"),
    available: (q: Q) => get<Room[]>("/rooms/available", q),
    create: (body: Q) => post<Room>("/rooms", body),
    update: (id: number, body: Q) => patch<Room>(`/rooms/${id}`, body),
  },
  bookings: {
    mine: () => get<RoomBooking[]>("/bookings/me"),
    create: (body: Q) => post<RoomBooking>("/bookings", body),
    cancelMine: (id: number) => patch<RoomBooking>(`/bookings/${id}/cancel-mine`),
    list: (q?: Q) => get<Paged<RoomBooking>>("/bookings", q),
    action: (id: number, action: "approve" | "reject" | "checkin" | "checkout" | "cancel", note?: string) =>
      patch<RoomBooking>(`/bookings/${id}/${action}`, { note }),
    checklist: (id: number) => get<{ items: string[]; fees: { DAMAGED: number; LOST: number } }>(`/bookings/${id}/checklist`),
    checkout: (id: number, body: { items: RoomInspectItem[]; maintenance: boolean; note?: string }) =>
      patch<RoomBooking>(`/bookings/${id}/checkout`, body),
  },
  materials: {
    list: (q?: Q) => get<Paged<Material>>("/materials", q),
    suggestions: (id: number) =>
      get<{ material: Material & { sold: number }; related: Material[]; boughtTogether: Material[]; sameFaculty: Material[]; facultyName: string; forYou: Material[] }>(
        `/materials/${id}/suggestions`,
      ),
    create: (body: Q) => post<Material>("/materials", body),
    update: (id: number, body: Q) => patch<Material>(`/materials/${id}`, body),
  },
  orders: {
    mine: () => get<Order[]>("/orders/me"),
    create: (body: Q) => post<Order>("/orders", body),
    cancelMine: (id: number) => patch<Order>(`/orders/${id}/cancel-mine`),
    list: (q?: Q) => get<Paged<Order>>("/orders", q),
    action: (id: number, action: "pay" | "complete" | "cancel") => patch<Order>(`/orders/${id}/${action}`),
  },
  staff: {
    list: (q?: Q) => get<Staff[]>("/staff", q),
    create: (body: Q) => post<Staff>("/staff", body),
    update: (id: number, body: Q) => patch<Staff>(`/staff/${id}`, body),
  },
  users: {
    list: (q?: Q) => get<Paged<UserInfo & { reader?: { studentCode: string }; staff?: { staffCode: string } }>>("/users", q),
    create: (body: Q) => post<UserInfo>("/users", body),
    update: (id: number, body: Q) => patch<UserInfo>(`/users/${id}`, body),
    resetPassword: (id: number, newPassword: string) => patch(`/users/${id}/reset-password`, { newPassword }),
  },
  reports: {
    overview: () => get<Overview>("/reports/overview"),
    serviceUsage: (q?: Q) =>
      get<Array<{ month: string; homeLoans: number; onsiteLoans: number; bookings: number; orders: number }>>(
        "/reports/service-usage",
        q,
      ),
    booksByMajor: () =>
      get<Array<{ major: string; giaoTrinhTitles: number; tltkTitles: number; giaoTrinhCopies: number; tltkCopies: number }>>(
        "/reports/books-by-major",
      ),
    annualUpdates: () => get<Array<{ year: number; newTitles: number; importedCopies: number; importCost: number }>>("/reports/annual-updates"),
    revenue: (year: number) =>
      get<{ year: number; rows: Array<{ month: number; sales: number; fines: number }>; totalSales: number; totalFines: number }>(
        "/reports/revenue",
        { year },
      ),
    byFaculty: (q?: Q) => get<FacultyStat[]>("/reports/by-faculty", q),
    topBooks: (q?: Q) => get<Array<{ id: number; title: string; code: string; loans: number }>>("/reports/top-books", q),
  },
  chatbot: {
    send: (message: string, sessionId: string) =>
      post<{ messages: Array<{ text: string; buttons?: Array<{ title: string; payload: string }> }> }>("/chatbot/message", {
        message,
        sessionId,
      }),
  },
};

export interface ImportSlip {
  id: number;
  code: string;
  supplier?: string | null;
  totalCost: string | number;
  note?: string | null;
  importedAt: string;
  staff: { user: { fullName: string } };
  _count?: { copies: number };
  copies?: Array<BookCopy & { book: { code: string; title: string } }>;
}

export interface LiquidationSlip {
  id: number;
  code: string;
  reason: string;
  createdAt: string;
  staff: { user: { fullName: string } };
  _count?: { copies: number };
  copies?: Array<BookCopy & { book: { code: string; title: string } }>;
}

export interface Overview {
  loansToday: number;
  homeToday: number;
  onsiteToday: number;
  overdueItems: number;
  borrowingItems: number;
  titles: number;
  copies: number;
  readers: number;
  lockedCards: number;
  pendingRequests: number;
  pendingBookings: number;
  roomsInUse: number;
  groupRooms: number;
  unpaidViolations: number;
  revenueThisMonth: number;
}
