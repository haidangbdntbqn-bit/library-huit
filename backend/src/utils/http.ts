import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = "Vui lòng đăng nhập") => new HttpError(401, msg);
export const forbidden = (msg = "Bạn không có quyền thực hiện thao tác này") => new HttpError(403, msg);
export const notFound = (msg = "Không tìm thấy dữ liệu") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

/** Bọc handler async để lỗi được chuyển tới middleware xử lý lỗi */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function parseId(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest("Mã không hợp lệ");
  return n;
}

export function paging(query: Request["query"]) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Lấy chuỗi không rỗng từ query */
export function qstr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function qint(value: unknown): number | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

export function paged<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize };
}
