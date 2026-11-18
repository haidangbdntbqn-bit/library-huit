import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { api, errMsg, type Card as LibCard, type Violation } from "../../src/api";
import { useAuth } from "../../src/auth";
import { fmtDate, money, status } from "../../src/format";
import { Badge, Btn, Card, colors, s } from "../../src/ui";

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [card, setCard] = useState<LibCard | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, v] = await Promise.all([api.myCard(), api.myViolations()]);
      setCard(c);
      setViolations(v);
    } catch (e) {
      Alert.alert("Lỗi", errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const [cardText] = status("card", card?.status);
  const hasCard = card && card.cardNumber;
  const unpaid = violations.filter((v) => v.status === "UNPAID");

  return (
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={s.title}>{user?.fullName}</Text>
      <Text style={s.muted}>
        MSSV {user?.reader?.studentCode} · {user?.reader?.major?.name ?? ""} {user?.reader?.className ? `· ${user.reader.className}` : ""}
      </Text>

      {hasCard ? (
        <View style={{ backgroundColor: card.status === "ACTIVE" ? colors.primary : colors.muted, borderRadius: 16, padding: 20, gap: 10 }}>
          <Text style={{ color: "#fff", opacity: 0.85 }}>Thẻ sinh viên – Thẻ thư viện HUIT · {cardText}</Text>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", letterSpacing: 2 }}>{card.cardNumber}</Text>
          <Text style={{ color: "#fff" }}>Hết hạn {fmtDate(card.expiresAt)}</Text>
          {card.status === "LOCKED" && <Text style={{ color: "#fff" }}>Thẻ đang bị khóa{card.note ? `: ${card.note}` : ""}. Liên hệ quầy thư viện.</Text>}
          {card.status === "EXPIRED" && <Text style={{ color: "#fff" }}>Thẻ đã hết hạn (6 năm kể từ năm nhập học).</Text>}
        </View>
      ) : (
        <Card style={{ gap: 8 }}>
          <Text style={s.h3}>Thẻ thư viện</Text>
          <Text style={s.muted}>Thẻ sinh viên được dùng làm thẻ thư viện và tự kích hoạt khi đăng ký tài khoản. Nếu chưa thấy thẻ, vui lòng liên hệ quầy thư viện.</Text>
        </Card>
      )}

      <Card style={{ gap: 8 }}>
        <Text style={s.h3}>Vi phạm {unpaid.length ? `(${unpaid.length} chưa nộp)` : ""}</Text>
        {violations.length ? (
          violations.map((v) => {
            const [t, tone] = status("violation", v.status);
            return (
              <View key={v.id} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, gap: 4 }}>
                <Text>{v.description}</Text>
                <View style={s.row}>
                  <Text style={s.muted}>
                    {fmtDate(v.createdAt)} · {money(v.fineAmount)}
                  </Text>
                  <Badge text={t} tone={tone} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={s.muted}>Bạn không có vi phạm nào.</Text>
        )}
      </Card>

      <Btn variant="outline" title="Nhà sách: sách, giáo trình, tài liệu bài giảng" onPress={() => router.push("/store")} />
      <Btn
        variant="danger"
        title="Đăng xuất"
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      />
    </ScrollView>
  );
}
