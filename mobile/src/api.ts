import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Địa chỉ API mặc định lấy từ .env lúc build; người dùng có thể đổi trong app (màn Đăng nhập → Cài đặt máy chủ) */
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:5000/api";
const TOKEN_KEY = "library_huit_token";
const API_URL_KEY = "library_huit_api_url";

// SecureStore không có trên web, dùng localStorage khi chạy thử bằng trình duyệt
const kv = {
  get: (k: string) => (Platform.OS === "web" ? Promise.resolve(localStorage.getItem(k)) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === "web" ? Promise.resolve(localStorage.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === "web" ? Promise.resolve(localStorage.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};
export const tokenStore = {
  get: () => kv.get(TOKEN_KEY),
  set: (v: string) => kv.set(TOKEN_KEY, v),
  clear: () => kv.del(TOKEN_KEY),
};

let apiUrl: string | null = null;
export async function getApiUrl(): Promise<string> {
  if (apiUrl === null) apiUrl = (await kv.get(API_URL_KEY)) || DEFAULT_API_URL;
  return apiUrl as string;
}
/** Chuẩn hóa: "192.168.1.23" → "http://192.168.1.23:5000/api" */
export function normalizeApiUrl(input: string): string {
  let u = input.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  const m = u.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  if (!m) return u;
  let host = m[1];
  if (!/:\d+$/.test(host) && /^http:/i.test(host)) host += ":5000";
  let path = m[2] ?? "";
  if (!path.endsWith("/api")) path += "/api";
  return host + path;
}
export async function setApiUrl(input: string): Promise<string> {
  const v = normalizeApiUrl(input);
  apiUrl = v;
  await kv.set(API_URL_KEY, v);
  return v;
}
export async function resetApiUrl(): Promise<string> {
  apiUrl = DEFAULT_API_URL;
  await kv.del(API_URL_KEY);
  return DEFAULT_API_URL;
}
/** Kiểm tra kết nối tới máy chủ (GET /health, chờ tối đa 5 giây) */
export async function checkServer(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(`${url}/health`, { signal: ctrl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, unknown> } = {},
): Promise<T> {
  const qs = options.query
    ? "?" +
      Object.entries(options.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const token = await tokenStore.get();
  const base = await getApiUrl();
  let res: Response;
  try {
    res = await fetch(`${base}${path}${qs}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Không kết nối được máy chủ (${base}). Kiểm tra địa chỉ ở mục Cài đặt máy chủ và Wi-Fi.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      await tokenStore.clear();
      onUnauthorized?.();
    }
    throw new ApiError(res.status, (data as { message?: string }).message ?? "Đã có lỗi xảy ra");
  }
  return data as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Đã có lỗi xảy ra");

// ---------- Kiểu dữ liệu dùng trong app ----------
export interface Major { id: number; name: string }
export interface Book {
  id: number; code: string; title: string; author: string; docType: string; shelf?: string | null;
  publisher?: string | null; publishYear?: number | null; description?: string | null; major?: Major | null;
  copiesSummary?: { total: number; available: number; onsiteAvailable: number; borrowed: number };
}
export interface LoanItem { id: number; dueAt: string; renewCount: number; returnedAt?: string | null; fine: string | number; copy: { barcode: string; book: Book } }
export interface Loan { id: number; code: string; loanType: string; status: string; borrowedAt: string; items: LoanItem[]; isOverdue?: boolean }
export interface BorrowRequest { id: number; status: string; loanType: string; createdAt: string; pickupBefore?: string | null; note?: string | null; book: Book; copy?: { barcode: string } | null }
export interface Room { id: number; name: string; roomType: string; capacity: number; floor?: string | null; equipment?: string | null; status: string; currentState?: string; schedule?: Array<{ startTime: string; endTime: string; status: string; people: number; mine?: boolean }> }
export interface Booking { id: number; code: string; startTime: string; endTime: string; people: number; status: string; note?: string | null; room: Room }
export interface Material {
  id: number; code: string; title: string; lecturer?: string | null; category: string; format: string; price: string | number; stock: number;
  description?: string | null; major?: { name: string } | null;
}
export interface MaterialSuggest {
  material: Material & { sold: number }; related: Material[]; boughtTogether: Material[]; sameFaculty: Material[]; facultyName: string; forYou: Material[];
}
export interface Notice { key: string; level: "danger" | "warning" | "info" | "success"; title: string; message: string; link: string }
export interface Shift { start: number; end: number; label: string }
export interface Order { id: number; code: string; totalAmount: string | number; status: string; paymentMethod: string; createdAt: string; items: Array<{ quantity: number; material: { title: string } }> }
export interface Card { status: string; cardNumber?: string | null; expiresAt?: string | null; note?: string | null }
export interface Violation { id: number; type: string; description: string; fineAmount: string | number; status: string; createdAt: string }
export interface Me {
  id: number; username: string; fullName: string; email?: string | null; phone?: string | null; role: string;
  reader?: { studentCode: string; className?: string | null; maxBooks: number; major?: Major | null; card?: Card | null } | null;
}
type Paged<T> = { items: T[]; total: number };

export const api = {
  login: (username: string, password: string) => request<{ token: string }>("/auth/login", { method: "POST", body: { username, password } }),
  register: (body: Record<string, unknown>) => request<{ token: string }>("/auth/register", { method: "POST", body }),
  me: () => request<Me>("/auth/me"),
  majors: () => request<Major[]>("/majors"),
  settings: () => request<{ values: Record<string, number> }>("/settings"),
  books: (query: Record<string, unknown>) => request<Paged<Book>>("/books", { query }),
  book: (id: number) => request<Book>(`/books/${id}`),
  requestBorrow: (bookId: number, loanType: "HOME" | "ONSITE" = "HOME") =>
    request<BorrowRequest>("/borrow-requests", { method: "POST", body: { bookId, loanType } }),
  myRequests: () => request<BorrowRequest[]>("/borrow-requests/me"),
  cancelRequest: (id: number) => request(`/borrow-requests/${id}/cancel`, { method: "PATCH" }),
  myLoans: () => request<Loan[]>("/loans/me"),
  renew: (itemId: number) => request<LoanItem>(`/loans/items/${itemId}/renew`, { method: "POST" }),
  rooms: (query: Record<string, unknown>) => request<Room[]>("/rooms", { query }),
  shifts: () => request<Shift[]>("/rooms/shifts"),
  notices: () => request<Notice[]>("/notifications/me"),
  myBookings: () => request<Booking[]>("/bookings/me"),
  book_room: (body: Record<string, unknown>) => request<Booking>("/bookings", { method: "POST", body }),
  cancelBooking: (id: number) => request(`/bookings/${id}/cancel-mine`, { method: "PATCH" }),
  materials: (category?: string) => request<Paged<Material>>("/materials", { query: { pageSize: 200, category } }),
  bookByBarcode: (code: string) => request<{ bookId: number }>(`/books/by-barcode/${encodeURIComponent(code)}`),
  materialSuggest: (id: number) => request<MaterialSuggest>(`/materials/${id}/suggestions`),
  createOrder: (body: Record<string, unknown>) => request<Order>("/orders", { method: "POST", body }),
  myOrders: () => request<Order[]>("/orders/me"),
  cancelOrder: (id: number) => request(`/orders/${id}/cancel-mine`, { method: "PATCH" }),
  myCard: () => request<Card | null>("/cards/me"),
  myViolations: () => request<Violation[]>("/violations/me"),
  chat: (message: string, sessionId: string) =>
    request<{ messages: Array<{ text: string; buttons?: Array<{ title: string; payload: string }> }> }>("/chatbot/message", {
      method: "POST",
      body: { message, sessionId },
    }),
};
