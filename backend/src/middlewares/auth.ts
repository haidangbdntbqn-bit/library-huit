import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { forbidden, unauthorized } from "../utils/http";
import type { Role } from "../utils/constants";

export interface AuthUser {
  id: number;
  role: Role;
  fullName: string;
  readerId?: number;
  staffId?: number;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

async function resolveUser(req: Request): Promise<AuthUser | undefined> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  let payload: AuthUser;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as AuthUser;
  } catch {
    throw unauthorized("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  }
  // Kiểm tra tài khoản còn hoạt động (bị khóa thì token cũ mất hiệu lực)
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { isActive: true, role: true, reader: { select: { id: true } }, staff: { select: { id: true } } },
  });
  if (!user || !user.isActive) throw unauthorized("Tài khoản không còn hoạt động");
  return {
    id: payload.id,
    fullName: payload.fullName,
    role: user.role as Role,
    readerId: user.reader?.id,
    staffId: user.staff?.id,
  };
}

/** Bắt buộc đăng nhập */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  resolveUser(req)
    .then((u) => {
      if (!u) throw unauthorized();
      req.user = u;
      next();
    })
    .catch(next);
}

/** Không bắt buộc đăng nhập (ví dụ chatbot cho khách) */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  resolveUser(req)
    .then((u) => {
      req.user = u;
      next();
    })
    .catch(() => next());
}

/** Phân quyền theo vai trò */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export const staffOnly = [authenticate, authorize("LIBRARIAN", "ADMIN")];
export const adminOnly = [authenticate, authorize("ADMIN")];
export const readerOnly = [authenticate, authorize("READER")];

/** Lấy readerId của người đang đăng nhập (bạn đọc) */
export function currentReaderId(req: Request): number {
  if (!req.user?.readerId) throw forbidden("Chức năng này chỉ dành cho bạn đọc");
  return req.user.readerId;
}

export function internalOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.headers["x-internal-key"] !== env.INTERNAL_API_KEY) return next(forbidden("Sai khóa nội bộ"));
  next();
}
