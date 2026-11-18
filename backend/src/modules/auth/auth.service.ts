import type { Reader, Staff, User } from "@prisma/client";
import type { AuthUser } from "../../middlewares/auth";
import type { Role } from "../../utils/constants";

type UserWithRelations = User & { reader?: Reader | null; staff?: Staff | null };

export function toAuthUser(user: UserWithRelations): AuthUser {
  return {
    id: user.id,
    role: user.role as Role,
    fullName: user.fullName,
    readerId: user.reader?.id,
    staffId: user.staff?.id,
  };
}

/** Bỏ mật khẩu trước khi trả về client */
export function publicUser<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

/** Các trường người dùng an toàn để select */
export const userSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;
