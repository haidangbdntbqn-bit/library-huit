import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { api, errMsg, type Book } from "../../src/api";
import { Btn, Card, colors, s } from "../../src/ui";

export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.book(Number(id)).then(setBook).catch((e) => Alert.alert("Lỗi", errMsg(e)));
  }, [id]);

  if (!book) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  const c = book.copiesSummary;

  const request = async (loanType: "HOME" | "ONSITE") => {
    setSending(true);
    try {
      await api.requestBorrow(book.id, loanType);
      Alert.alert("Đã gửi yêu cầu mượn", `Hình thức: ${loanType === "HOME" ? "mượn về nhà" : "đọc tại chỗ"}. Khi trạng thái chuyển sang "Sẵn sàng nhận", hãy mang thẻ sinh viên đến quầy nhận sách.`, [
        { text: "Xem yêu cầu", onPress: () => router.push("/(tabs)/loans") },
        { text: "Đóng" },
      ]);
    } catch (e) {
      Alert.alert("Không gửi được", errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.muted}>{book.docType === "GIAO_TRINH" ? "Giáo trình" : "Tài liệu tham khảo"}</Text>
      <Text style={[s.title, { fontSize: 24 }]}>{book.title}</Text>
      <Text style={s.muted}>{book.author}</Text>
      <Card style={{ flexDirection: "row", justifyContent: "space-around" }}>
        {[
          [c?.available ?? 0, "mượn về nhà"],
          [c?.onsiteAvailable ?? 0, "đọc tại chỗ"],
          [c?.borrowed ?? 0, "đang mượn"],
        ].map(([n, l]) => (
          <View key={String(l)} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: colors.primaryDark }}>{n}</Text>
            <Text style={s.muted}>{l}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ gap: 6 }}>
        <Text>Mã sách: {book.code}</Text>
        <Text>Vị trí kệ: {book.shelf ?? "—"}</Text>
        <Text>Nhà xuất bản: {book.publisher ?? "—"}</Text>
        <Text>Năm xuất bản: {book.publishYear ?? "—"}</Text>
        <Text>Ngành: {book.major?.name ?? "Dùng chung"}</Text>
      </Card>
      {!!book.description && <Text style={{ lineHeight: 22 }}>{book.description}</Text>}
      <Btn title={c?.available ? "Đặt mượn về nhà" : "Hết bản mượn về nhà"} disabled={!c?.available} loading={sending} onPress={() => request("HOME")} />
      <Btn
        variant="outline"
        title="Đặt đọc tại chỗ"
        disabled={!((c?.available ?? 0) + (c?.onsiteAvailable ?? 0))}
        loading={sending}
        onPress={() => request("ONSITE")}
      />
    </ScrollView>
  );
}
