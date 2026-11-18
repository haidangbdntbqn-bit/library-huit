import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { adminOnly } from "../../middlewares/auth";
import { asyncHandler, paged, paging, qint, qstr } from "../../utils/http";

/** Tên thao tác dễ đọc theo phương thức + đường dẫn API */
const ACTIONS: Array<[string, RegExp, string]> = [
  ["POST", /^\/auth\/login$/, "Đăng nhập"],
  ["POST", /^\/loans$/, "Lập phiếu mượn"],
  ["POST", /^\/returns$/, "Nhận trả sách"],
  ["PATCH", /^\/borrow-requests\/\d+\/ready$/, "Soạn sách cho yêu cầu mượn"],
  ["PATCH", /^\/borrow-requests\/\d+\/reject$/, "Từ chối yêu cầu mượn"],
  ["PATCH", /^\/violations\/\d+\/pay$/, "Thu tiền phạt"],
  ["PATCH", /^\/violations\/\d+\/waive$/, "Miễn tiền phạt"],
  ["POST", /^\/violations$/, "Ghi nhận vi phạm"],
  ["PATCH", /^\/cards\/\d+\/lock$/, "Khóa thẻ thư viện"],
  ["PATCH", /^\/cards\/\d+\/unlock$/, "Mở khóa thẻ thư viện"],
  ["POST", /^\/readers$/, "Tạo đọc giả"],
  ["PATCH", /^\/readers\/\d+$/, "Sửa đọc giả"],
  ["POST", /^\/books$/, "Thêm đầu sách"],
  ["PATCH", /^\/books\/\d+$/, "Sửa đầu sách"],
  ["PATCH", /^\/copies\/\d+$/, "Sửa bản sách"],
  ["POST", /^\/imports$/, "Lập phiếu nhập sách"],
  ["POST", /^\/liquidations$/, "Lập phiếu thanh lý"],
  ["POST", /^\/rooms$/, "Thêm phòng"],
  ["PATCH", /^\/rooms\/\d+$/, "Sửa phòng"],
  ["PATCH", /^\/bookings\/\d+\/approve$/, "Duyệt lượt mượn phòng"],
  ["PATCH", /^\/bookings\/\d+\/reject$/, "Từ chối lượt mượn phòng"],
  ["PATCH", /^\/bookings\/\d+\/checkin$/, "Nhận phòng"],
  ["PATCH", /^\/bookings\/\d+\/checkout$/, "Trả phòng, kiểm tra tình trạng phòng"],
  ["PATCH", /^\/orders\/\d+\/pay$/, "Xác nhận thanh toán đơn hàng"],
  ["PATCH", /^\/orders\/\d+\/complete$/, "Giao sách, tài liệu"],
  ["PATCH", /^\/orders\/\d+\/cancel$/, "Hủy đơn hàng"],
  ["POST", /^\/materials$/, "Thêm sách, tài liệu bán"],
  ["PATCH", /^\/materials\/\d+$/, "Sửa sách, tài liệu bán"],
  ["POST", /^\/staff$/, "Thêm nhân viên"],
  ["PATCH", /^\/staff\/\d+$/, "Sửa nhân viên"],
  ["PATCH", /^\/users\/\d+/, "Cập nhật tài khoản"],
  ["PUT", /^\/settings$/, "Đổi quy định nghiệp vụ"],
  ["POST", /^\/faculties$/, "Thêm khoa"],
  ["PATCH", /^\/faculties\/\d+$/, "Sửa khoa / tỉ lệ hoa hồng"],
  ["POST", /^\/notifications\/send-reminders$/, "Gửi email nhắc hạn trả"],
];

function actionOf(method: string, path: string) {
  return ACTIONS.find(([m, r]) => m === method && r.test(path))?.[2] ?? `${method} ${path}`;
}

/** Bỏ mật khẩu, rút gọn nội dung yêu cầu trước khi lưu */
function summarize(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const clean = JSON.stringify(body, (k, v) => (/password|token/i.test(k) ? "***" : v));
  return clean.length > 1000 ? `${clean.slice(0, 997)}...` : clean;
}

/**
 * Middleware ghi nhật ký: mọi thao tác thay đổi dữ liệu (POST/PATCH/PUT/DELETE) của thủ thư, quản trị viên,
 * và mọi lần đăng nhập. Ghi sau khi phản hồi xong để không làm chậm yêu cầu.
 */
export function auditTrail(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "OPTIONS") return next();
  const path = req.originalUrl.replace(/^\/api/, "").split("?")[0];
  res.on("finish", () => {
    const isLogin = path === "/auth/login";
    const staff = req.user && (req.user.role === "LIBRARIAN" || req.user.role === "ADMIN");
    if (!isLogin && !staff) return;
    if (path.startsWith("/chatbot") || path.startsWith("/internal")) return;
    prisma.auditLog
      .create({
        data: {
          userId: req.user?.id ?? null,
          username: isLogin ? String((req.body as { username?: string })?.username ?? "").slice(0, 50) : null,
          role: req.user?.role ?? null,
          action: isLogin && res.statusCode >= 400 ? "Đăng nhập thất bại" : actionOf(req.method, path),
          method: req.method,
          path,
          status: res.statusCode,
          detail: isLogin ? null : summarize(req.body),
          ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0] ?? req.socket.remoteAddress ?? null,
        },
      })
      .catch(() => undefined);
  });
  next();
}

/** Quản trị viên xem nhật ký: GET /audit-logs?q=&userId=&from=&to= */
export const auditRoutes = Router();
auditRoutes.get(
  "/",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const q = qstr(req.query.q);
    const userId = qint(req.query.userId);
    const from = qstr(req.query.from);
    const to = qstr(req.query.to);
    const where: Prisma.AuditLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(q ? { OR: [{ action: { contains: q } }, { username: { contains: q } }, { path: { contains: q } }, { detail: { contains: q } }] } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.count({ where }),
    ]);
    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.userId).filter((x): x is number => x !== null))] } },
      select: { id: true, username: true, fullName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json(paged(items.map((i) => ({ ...i, user: i.userId ? byId.get(i.userId) ?? null : null })), total, page, pageSize));
  }),
);
