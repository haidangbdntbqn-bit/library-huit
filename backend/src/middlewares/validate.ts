import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

/** Kiểm tra và chuẩn hóa req.body theo schema zod */
export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
