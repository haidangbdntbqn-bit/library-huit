import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { optionalAuth, staffOnly } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { MATERIAL_FORMATS } from "../../utils/constants";
import { asyncHandler, notFound, paged, paging, parseId, qint, qstr } from "../../utils/http";

/** Sách, giáo trình và tài liệu bài giảng bán tại thư viện (nhà sách thư viện) */
const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = paging(req.query);
    const q = qstr(req.query.q);
    const majorId = qint(req.query.majorId);
    const category = qstr(req.query.category);
    const all = req.query.all === "true"; // thủ thư xem cả tài liệu ngừng bán
    const where: Prisma.MaterialWhereInput = {
      ...(all ? {} : { isActive: true }),
      ...(majorId ? { majorId } : {}),
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { code: { contains: q } }, { lecturer: { contains: q } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.material.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { major: { include: { faculty: true } } } }),
      prisma.material.count({ where }),
    ]);
    res.json(paged(items, total, page, pageSize));
  }),
);

// ---------- Gợi ý sách, tài liệu (giống gợi ý mua sắm) ----------

/** Bỏ tiền tố "Bài giảng", "Giáo trình", hậu tố "(bản PDF)" để so tên môn học */
function coreTitle(t: string) {
  return t
    .toLowerCase()
    .replace(/\(bản pdf\)/g, "")
    .replace(/^(bài giảng|giáo trình|đề cương ôn tập|bài tập|tài liệu ôn thi)\s+/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
}
const STOP = new Set(["và", "của", "cho", "với", "trong", "các", "những", "một", "1", "2"]);
const tokens = (t: string) => new Set(coreTitle(t).split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)));
function similarity(a: string, b: string) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => B.has(w) && inter++);
  return inter / (A.size + B.size - inter); // hệ số Jaccard
}

/**
 * GET /materials/:id/suggestions
 * - related: cùng môn học / tên gần giống (giáo trình ↔ bài giảng ↔ sách tham khảo cùng chủ đề), ưu tiên cùng ngành
 * - boughtTogether: bạn đọc khác thường mua kèm (cùng đơn hàng)
 * - sameFaculty: tài liệu bán chạy cùng khoa
 * - forYou: bán chạy của ngành người đang xem (khi bạn đọc đăng nhập, ngành khác ngành của tài liệu)
 */
router.get(
  "/:id/suggestions",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const all = await prisma.material.findMany({ where: { isActive: true }, include: { major: { include: { faculty: true } } } });
    const current = all.find((m) => m.id === id) ?? (await prisma.material.findUnique({ where: { id }, include: { major: { include: { faculty: true } } } }));
    if (!current) throw notFound("Không tìm thấy tài liệu");
    const others = all.filter((m) => m.id !== id && !(m.format === "PRINT" && m.stock === 0));

    // số lượng đã bán của từng tài liệu (đơn không bị hủy)
    const sold = await prisma.orderItem.groupBy({ by: ["materialId"], where: { order: { status: { not: "CANCELLED" } } }, _sum: { quantity: true } });
    const soldOf = new Map(sold.map((s) => [s.materialId, s._sum.quantity ?? 0]));
    const popular = (a: { id: number }, b: { id: number }) => (soldOf.get(b.id) ?? 0) - (soldOf.get(a.id) ?? 0);

    // mua kèm: các tài liệu khác trong cùng đơn với tài liệu đang xem
    const orderIds = (
      await prisma.orderItem.findMany({ where: { materialId: id, order: { status: { not: "CANCELLED" } } }, select: { orderId: true } })
    ).map((o) => o.orderId);
    const pairs = orderIds.length
      ? await prisma.orderItem.groupBy({ by: ["materialId"], where: { orderId: { in: orderIds }, materialId: { not: id } }, _count: { _all: true } })
      : [];
    const together = new Map(pairs.map((p) => [p.materialId, p._count._all]));

    const used = new Set<number>();
    const take = <T extends { id: number }>(list: T[], n: number) => {
      const out = list.filter((m) => !used.has(m.id)).slice(0, n);
      out.forEach((m) => used.add(m.id));
      return out;
    };

    const scored = others
      .map((m) => ({ m, score: similarity(current.title, m.title) + (m.majorId && m.majorId === current.majorId ? 0.25 : 0) + (m.category !== current.category ? 0.05 : 0) }))
      .filter((x) => x.score >= 0.3)
      .sort((a, b) => b.score - a.score || popular(a.m, b.m))
      .map((x) => x.m);
    const related = take(scored, 6);

    const boughtTogether = take(
      others.filter((m) => together.has(m.id)).sort((a, b) => (together.get(b.id) ?? 0) - (together.get(a.id) ?? 0) || popular(a, b)),
      6,
    );

    const facultyId = current.major?.facultyId ?? null;
    const sameFaculty = take(
      others.filter((m) => (facultyId ? m.major?.facultyId === facultyId : !m.majorId)).sort(popular),
      8,
    );

    let forYou: typeof others = [];
    if (req.user?.readerId) {
      const reader = await prisma.reader.findUnique({ where: { id: req.user.readerId }, select: { majorId: true } });
      if (reader?.majorId && reader.majorId !== current.majorId) forYou = take(others.filter((m) => m.majorId === reader.majorId).sort(popular), 6);
    }

    res.json({
      material: { ...current, sold: soldOf.get(current.id) ?? 0 },
      related,
      boughtTogether,
      sameFaculty,
      facultyName: current.major?.faculty?.name ?? "Tài liệu dùng chung",
      forYou,
    });
  }),
);

const schema = z.object({
  code: z.string().trim().min(2).max(30),
  title: z.string().trim().min(2),
  lecturer: z.string().trim().nullish(),
  majorId: z.number().int().positive().nullable().optional(),
  category: z.enum(["BAI_GIANG", "GIAO_TRINH", "SACH_THAM_KHAO"]).default("BAI_GIANG"),
  format: z.enum(MATERIAL_FORMATS).default("PRINT"),
  price: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  description: z.string().nullish(),
  isActive: z.boolean().default(true),
});

router.post(
  "/",
  ...staffOnly,
  validate(schema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await prisma.material.create({ data: req.body }));
  }),
);

router.patch(
  "/:id",
  ...staffOnly,
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    res.json(await prisma.material.update({ where: { id: parseId(req.params.id) }, data: req.body }));
  }),
);

export default router;
