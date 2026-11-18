import { Router } from "express";
import { z } from "zod";
import { staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { RETURN_CONDITIONS } from "../../utils/constants";
import { asyncHandler, badRequest, qstr } from "../../utils/http";
import { lookupReturn, openItemsOfReader, returnItems } from "./loans.service";

/** Trả sách: đúng hạn / trễ hạn / hỏng / mất */
const router = Router();
router.use(...staffOnly);

router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    const barcode = qstr(req.query.barcode);
    if (!barcode) throw badRequest("Nhập mã vạch sách");
    res.json(await lookupReturn(barcode));
  }),
);

/** Tra theo bạn đọc: GET /returns/reader?code=MSSV */
router.get(
  "/reader",
  asyncHandler(async (req, res) => {
    const code = qstr(req.query.code);
    if (!code) throw badRequest("Nhập MSSV hoặc số thẻ");
    res.json(await openItemsOfReader(code));
  }),
);

const schema = z.object({
  items: z
    .array(
      z.object({
        barcode: z.string().trim().min(1),
        condition: z.enum(RETURN_CONDITIONS).default("GOOD"),
        note: z.string().trim().max(100).optional(),
      }),
    )
    .min(1),
});

router.post(
  "/",
  validate(schema),
  asyncHandler(async (req, res) => {
    res.json({ results: await returnItems(req.body.items) });
  }),
);

export default router;
