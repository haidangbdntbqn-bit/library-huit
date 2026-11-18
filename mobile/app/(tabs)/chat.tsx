import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Chip, colors, s } from "../../src/ui";

type Msg = { id: string; from: "user" | "bot"; text: string; buttons?: Array<{ title: string; payload: string }> };

const SUGGEST = ["Còn phòng nhóm cho 5 người chiều nay không?", "Tìm sách cơ sở dữ liệu", "Sách mình đang mượn khi nào hết hạn?", "Quy định mượn sách"];

export default function ChatScreen() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "0", from: "bot", text: `Chào ${user?.fullName ?? "bạn"}! Mình có thể tìm sách, gợi ý phòng học nhóm, xem hạn trả và giải đáp quy định mượn.` },
  ]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const sessionId = useRef(Math.random().toString(36).slice(2, 12)).current;

  const send = async (content: string, shown?: string) => {
    const t = content.trim();
    if (!t || sending) return;
    setText("");
    setMsgs((m) => [...m, { id: `${Date.now()}u`, from: "user", text: shown ?? t }]);
    setSending(true);
    try {
      const r = await api.chat(t, sessionId);
      setMsgs((m) => [...m, ...r.messages.map((x, i) => ({ id: `${Date.now()}b${i}`, from: "bot" as const, text: x.text, buttons: x.buttons }))]);
    } catch {
      setMsgs((m) => [...m, { id: `${Date.now()}e`, from: "bot", text: "Không gửi được tin nhắn, bạn thử lại sau nhé." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: m }) => (
          <View style={{ gap: 6, alignItems: m.from === "user" ? "flex-end" : "flex-start" }}>
            <View
              style={{
                maxWidth: "85%",
                padding: 12,
                borderRadius: 14,
                backgroundColor: m.from === "user" ? colors.primary : colors.surface,
                borderWidth: m.from === "user" ? 0 : 1,
                borderColor: colors.line,
              }}
            >
              <Text style={{ color: m.from === "user" ? "#fff" : colors.text, lineHeight: 21 }}>{m.text}</Text>
            </View>
            {m.buttons?.map((b) => <Chip key={b.payload} label={b.title} onPress={() => send(b.payload, b.title)} />)}
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: 8 }}>
            {msgs.length === 1 && SUGGEST.map((q) => <Chip key={q} label={q} onPress={() => send(q)} />)}
            {sending && <Text style={s.muted}>Đang trả lời…</Text>}
          </View>
        }
      />
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Hỏi về sách, phòng, hạn trả…" value={text} onChangeText={setText} onSubmitEditing={() => send(text)} />
        <Pressable
          accessibilityLabel="Gửi"
          onPress={() => send(text)}
          style={{ width: 46, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="send" color="#fff" size={18} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
