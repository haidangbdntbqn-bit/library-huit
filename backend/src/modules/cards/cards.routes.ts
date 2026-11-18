import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { currentReaderId, readerOnly, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { addDays } from "../../utils/date";
import { asyncHandler, badRequest, notFound, paged, paging, parseId, qstr } from "../../utils/http";
import { cardExpiry } from "../rules/rules";
import { getSettings } from "../settings/settings.service";

/**
 * Thẻ thư viện: dùng chính thẻ sinh viên (số thẻ = MSSV / mã cán bộ).
 * Thẻ được kích hoạt ngay khi tạo tài khoản bạn đọc, không cần duyệt, không gia hạn;
 * hết hạn sau 6 năm kể từ năm nhập học. Thủ thư chỉ khóa / mở khóa khi có vi phạm.
 */
const router = Router();

/**
 * Hạn thẻ: sinh viên tính từ ngày 1/9 năm nhập học (lấy từ MSSV dạng 2001YYxxxx) cộng thời hạn cấu hình (mặc định 6 năm);
 * giảng viên, cán bộ và MSSV khác định dạng tính từ ngày tạo.
 */
export async function newCardData(studentCode: string, readerType: string, now = new Date()) {
  const s = await getSettings();
  return { status: "ACTIVE", cardNumber: studentCode, issuedAt: now, expiresAt: cardExpiry(studentCode, readerType, now, s.CARD_VALID_DAYS) };
}

/** Tự chuyển thẻ quá hạn sang EXPIRED khi đọc ra */
export async function refreshCardExpiry(readerId: number) {
  const card = await prisma.libraryCard.findUnique({ where: { readerId } });
  if (card?.status === "ACTIVE" && card.expiresAt && card.expiresAt < new Date()) {
    return prisma.libraryCard.update({ where: { id: card.id }, data: { status: "EXPIRED" } });
  }
  return card;
}

router.get(
  "/me",
  ...readerOnly,
  asyncHandler(async (req, res) => {
    res.json(await refreshCardExpiry(currentReaderId(req)));
  }),
);

router.get(
  "/",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const status = qstr(req.query.status);
    const q = qstr(req.query.q);
    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? { OR: [{ cardNumber: { contains: q } }, { reader: { studentCode: { contains: q } } }, { reader: { user: { fullName: { contains: q } } } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.libraryCard.findMany({
        where,
        skip,
        take,
        orderBy: { requestedAt: "desc" },
        include: { reader: { include: { user: { select: { fullName: true, email: true, phone: true } }, major: true } } },
      }),
      prisma.libraryCard.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

async function findCard(id: number) {
  const card = await prisma.libraryCard.findUnique({ where: { id }, include: { reader: true } });
  if (!card) throw notFound("Không tìm thấy thẻ");
  return card;
}

const noteSchema = z.object({ note: z.string().trim().max(300).optional() });

router.patch(
  "/:id/lock",
  ...staffOnly,
  validate(noteSchema),
  asyncHandler(async (req, res) => {
    const card = await findCard(parseId(req.params.id));
    if (card.status !== "ACTIVE") throw badRequest("Chỉ khóa được thẻ đang hoạt động");
    res.json(await prisma.libraryCard.update({ where: { id: card.id }, data: { status: "LOCKED", note: req.body.note } }));
  }),
);

router.patch(
  "/:id/unlock",
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const card = await findCard(parseId(req.params.id));
    if (card.status !== "LOCKED") throw badRequest("Thẻ không ở trạng thái khóa");
    const expired = card.expiresAt && card.expiresAt < new Date();
    res.json(
      await prisma.libraryCard.update({ where: { id: card.id }, data: { status: expired ? "EXPIRED" : "ACTIVE", note: null } }),
    );
  }),
);

export default router;
