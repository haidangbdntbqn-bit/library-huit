import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { api, errMsg, type Book } from "../../src/api";
import { Badge, Card, Empty, colors, s } from "../../src/ui";
import { NoticeBanner } from "../../src/notices";

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (keyword: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await api.books({ q: keyword, pageSize: 30 });
      setBooks(r.items);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  return (
    <FlatList
      data={books}
      keyExtractor={(b) => String(b.id)}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(q)} />}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <NoticeBanner only={(n) => n.level === "danger" || n.level === "warning" || n.key.startsWith("ready-")} />
          <View style={[s.input, s.row, { paddingVertical: 4 }]}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={{ flex: 1, paddingVertical: 8, fontSize: 15 }}
              placeholder="Tên sách, tác giả, ISBN…"
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              onSubmitEditing={() => load(q)}
            />
            <Pressable onPress={() => router.push("/scan")} accessibilityLabel="Quét mã vạch sách" hitSlop={8}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary} />
            </Pressable>
          </View>
          <Pressable onPress={() => router.push("/store")}>
            <Card style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.h3}>Nhà sách: giáo trình, sách, bài giảng</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Pressable>
          {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
          <Text style={s.muted}>{q ? `Kết quả cho "${q}"` : "Sách mới về thư viện"}</Text>
        </View>
      }
      ListEmptyComponent={loading ? null : <Empty text="Không tìm thấy tài liệu phù hợp" />}
      renderItem={({ item: b }) => (
        <Pressable onPress={() => router.push(`/book/${b.id}`)}>
          <Card style={{ gap: 6 }}>
            <Text style={s.h3}>{b.title}</Text>
            <Text style={s.muted}>
              {b.author} · Kệ {b.shelf ?? "—"}
            </Text>
            {b.copiesSummary?.available ? (
              <Badge tone="good" text={`Còn ${b.copiesSummary.available} bản mượn về`} />
            ) : b.copiesSummary?.onsiteAvailable ? (
              <Badge tone="info" text="Chỉ đọc tại chỗ" />
            ) : (
              <Badge tone="bad" text="Tạm hết bản" />
            )}
          </Card>
        </Pressable>
      )}
    />
  );
}
