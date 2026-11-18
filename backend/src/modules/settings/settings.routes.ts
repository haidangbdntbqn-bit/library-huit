import { Router } from "express";
import { z } from "zod";
import { adminOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/http";
import { DEFAULT_SETTINGS, SETTING_LABELS, getSettings, updateSettings } from "./settings.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ values: await getSettings(), labels: SETTING_LABELS });
  }),
);

const schema = z
  .object(Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((k) => [k, z.number().min(0).optional()])))
  .strict();

router.put(
  "/",
  ...adminOnly,
  validate(schema),
  asyncHandler(async (req, res) => {
    res.json({ values: await updateSettings(req.body) });
  }),
);

export default router;
