import { CloseOutlined, MessageOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { ChatMessage } from "../types";

const SESSION_KEY = "library_chat_session";
const sessionId = localStorage.getItem(SESSION_KEY) ?? Math.random().toString(36).slice(2, 12);
localStorage.setItem(SESSION_KEY, sessionId);

const SUGGESTIONS = ["Gợi ý sách cho ngành của mình", "Còn phòng nhóm cho 5 người chiều nay không?", "Tìm sách co so du lieu", "Giáo trình nguyên lý kế toán giá bao nhiêu?", "Sách mình đang mượn khi nào hết hạn?"];

/** Hộp chat trợ lý thư viện (gửi qua backend -> Rasa) */
export function ChatBox({ height }: { height?: number | string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "bot", text: "Chào bạn! Mình là trợ lý thư viện. Mình có thể tìm sách, gợi ý phòng học nhóm, xem hạn trả sách và giải đáp quy định mượn." },
  ]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages]);

  const send = async (msg: string, shown?: string) => {
    const content = msg.trim();
    if (!content || sending) return;
    setText("");
    setMessages((m) => [...m, { from: "user", text: shown ?? content }]);
    setSending(true);
    try {
      const res = await api.chatbot.send(content, sessionId);
      setMessages((m) => [...m, ...res.messages.map((r) => ({ from: "bot" as const, text: r.text, buttons: r.buttons }))]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Không gửi được tin nhắn. Bạn thử lại sau nhé." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: height ?? "100%", minHeight: 0 }}>
      <div className="chat-body" ref={bodyRef} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div className={`bubble ${m.from}`}>{m.text}</div>
            {m.buttons?.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {m.buttons.map((b) => (
                  <Button key={b.payload} size="small" onClick={() => send(b.payload, b.title)}>
                    {b.title}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {messages.length === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SUGGESTIONS.map((s) => (
              <Button key={s} size="small" style={{ textAlign: "left", height: "auto", whiteSpace: "normal", padding: "6px 10px" }} onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
        {sending && <div className="bubble bot muted">Đang trả lời…</div>}
      </div>
      <div className="chat-foot">
        <Input
          aria-label="Nhập câu hỏi"
          placeholder="Hỏi về sách, phòng, hạn trả…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={() => send(text)}
        />
        <Button type="primary" icon={<SendOutlined />} aria-label="Gửi" loading={sending} onClick={() => send(text)} />
      </div>
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <section className="chat-panel" aria-label="Trợ lý thư viện">
          <div className="chat-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong className="display">Trợ lý thư viện</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                Tư vấn mượn sách, mượn phòng
              </div>
            </div>
            <Button type="text" icon={<CloseOutlined />} aria-label="Đóng" onClick={() => setOpen(false)} />
          </div>
          <ChatBox />
        </section>
      )}
      <Button
        className="chat-fab"
        type="primary"
        icon={open ? <CloseOutlined /> : <MessageOutlined />}
        aria-label={open ? "Đóng trợ lý thư viện" : "Mở trợ lý thư viện"}
        title="Trợ lý thư viện"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {!open && <span className="chat-dot" aria-hidden />}
      </Button>
    </>
  );
}
