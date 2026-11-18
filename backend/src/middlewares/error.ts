import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/http";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Không có API ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      message: `Dữ liệu không hợp lệ: ${first.path.join(".") || "body"} - ${first.message}`,
      details: err.issues,
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ message: "Dữ liệu bị trùng (mã hoặc tên đã tồn tại)" });
    if (err.code === "P2025") return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    if (err.code === "P2003") return res.status(400).json({ message: "Dữ liệu liên kết không hợp lệ hoặc đang được sử dụng" });
  }
  if (err instanceof SyntaxError) return res.status(400).json({ message: "JSON không hợp lệ" });
  console.error(err);
  res.status(500).json({ message: "Lỗi máy chủ, vui lòng thử lại sau" });
}
