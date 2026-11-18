import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authenticate, optionalAuth } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { asyncHandler } from "../../utils/http";

/**
 * Cầu nối giữa web/app và Rasa. Frontend không gọi Rasa trực tiếp
 * để backend gắn danh tính người dùng và lưu lịch sử hội thoại.
 */
const router = Router();

interface RasaMessage {
  recipient_id: string;
  text?: string;
  buttons?: Array<{ title: string; payload: string }>;
}

const schema = z.object({
  message: z.string().trim().min(1).max(1000),
  sessionId: z.string().trim().max(60).optional(),
});

router.post(
  "/message",
  optionalAuth,
  validate(schema),
  asyncHandler(async (req, res) => {
    const { message, sessionId } = req.body as z.infer<typeof schema>;
    // sender_id dạng "user-12" giúp action server biết người hỏi là ai
    const sender = req.user ? `user-${req.user.id}` : `guest-${sessionId ?? "anonymous"}`;
    let replies: Array<{ text: string; buttons?: RasaMessage["buttons"] }>;
    try {
      const r = await fetch(`${env.RASA_URL}/webhooks/rest/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender, message }),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`Rasa trả về ${r.status}`);
      const data = (await r.json()) as RasaMessage[];
      replies = data.filter((m) => m.text).map((m) => ({ text: m.text!, buttons: m.buttons }));
      if (!replies.length) replies = [{ text: "Mình chưa hiểu ý bạn, bạn có thể hỏi lại theo cách khác không?" }];
    } catch (e) {
      console.error("Không kết nối được Rasa:", (e as Error).message);
      replies = [{ text: "Trợ lý đang tạm ngưng. Bạn vui lòng thử lại sau hoặc liên hệ quầy thư viện." }];
    }
    await prisma.chatLog
      .create({
        data: { userId: req.user?.id, sessionId: sender, message, reply: replies.map((m) => m.text).join("\n") },
      })
      .catch(() => undefined);
    res.json({ messages: replies });
  }),
);

router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const logs = await prisma.chatLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.json(logs.reverse());
  }),
);

export default router;
