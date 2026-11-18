import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { NoticeBanner } from "../../src/notices";
import { api, errMsg, type BorrowRequest, type Loan, type LoanItem } from "../../src/api";
import { daysLeft, fmtDate, money, status } from "../../src/format";
import { Badge, Btn, Card, Chip, Empty, s } from "../../src/ui";

type Tab = "open" | "requests" | "history";

export default function LoansScreen() {
  const [tab, setTab] = useState<Tab>("open");
  const [loans, setLoans] = useState<Loan[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [maxRenew, setMaxRenew] = useState(1);
  const [renewDays, setRenewDays] = useState(3);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r, st] = await Promise.all([api.myLoans(), api.myRequests(), api.settings()]);
      setLoans(l);
      setRequests(r);
      setMaxRenew(st.values.MAX_RENEWALS ?? 1);
      setRenewDays(st.values.RENEW_DAYS ?? 3);
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

  const open = loans
    .flatMap((l) => l.items.filter((i) => !i.returnedAt).map((i) => ({ ...i, loan: l })))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const renew = (item: LoanItem) =>
    Alert.alert("Gia hạn sách", `Gia hạn "${item.copy.book.title}" thêm ${renewDays} ngày?`, [
      { text: "Không" },
      {
        text: "Gia hạn",
        onPress: async () => {
          try {
            const r = await api.renew(item.id);
            Alert.alert("Đã gia hạn", `Hạn trả mới: ${fmtDate(r.dueAt)}`);
            load();
          } catch (e) {
            Alert.alert("Không gia hạn được", errMsg(e));
          }
        },
      },
    ]);

  const cancel = async (id: number) => {
    try {
      await api.cancelRequest(id);
      load();
    } catch (e) {
      Alert.alert("Lỗi", errMsg(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <NoticeBanner only={(n) => n.key.startsWith("late-") || n.key.startsWith("due-") || n.key.startsWith("ready-") || n.key === "fine"} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={`Đang mượn (${open.length})`} active={tab === "open"} onPress={() => setTab("open")} />
        <Chip label="Yêu cầu" active={tab === "requests"} onPress={() => setTab("requests")} />
        <Chip label="Lịch sử" active={tab === "history"} onPress={() => setTab("history")} />
      </View>

      {tab === "open" &&
        (open.length ? (
          open.map((i) => {
            const left = daysLeft(i.dueAt);
            return (
              <Card key={i.id} style={{ gap: 6 }}>
                <Text style={s.h3}>{i.copy.book.title}</Text>
                <Text style={s.muted}>
                  {i.loan.loanType === "HOME" ? "Mượn về nhà" : "Đọc tại chỗ"} · mượn ngày {fmtDate(i.loan.borrowedAt)}
                </Text>
                <Badge tone={left < 0 ? "bad" : left <= 2 ? "warn" : "info"} text={`Hạn trả ${fmtDate(i.dueAt)} · ${left < 0 ? `quá ${-left} ngày` : `còn ${left} ngày`}`} />
                {i.loan.loanType === "HOME" && (
                  <Btn small variant="outline" title={i.renewCount >= maxRenew ? "Đã gia hạn tối đa" : "Gia hạn"} disabled={i.renewCount >= maxRenew || left < 0} onPress={() => renew(i)} />
                )}
              </Card>
            );
          })
        ) : (
          <Empty text="Bạn không có sách nào đang mượn" />
        ))}

      {tab === "requests" &&
        (requests.length ? (
          requests.map((r) => {
            const [text, tone] = status("request", r.status);
            return (
              <Card key={r.id} style={{ gap: 6 }}>
                <Text style={s.h3}>{r.book.title}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Badge text={text} tone={tone} />
                  <Badge text={r.loanType === "ONSITE" ? "Đọc tại chỗ" : "Mượn về nhà"} />
                </View>
                {r.status === "PENDING" && <Text style={s.muted}>Thư viện đang soạn sách cho bạn.</Text>}
                {r.status === "READY" && <Text>Đã giữ bản {r.copy?.barcode ?? ""}, nhận tại quầy trước {fmtDate(r.pickupBefore)}</Text>}
                {!!r.note && <Text style={s.muted}>{r.note}</Text>}
                {["PENDING", "READY"].includes(r.status) && <Btn small variant="danger" title="Hủy yêu cầu" onPress={() => cancel(r.id)} />}
              </Card>
            );
          })
        ) : (
          <Empty text="Chưa có yêu cầu mượn. Tìm sách và bấm Đặt mượn." />
        ))}

      {tab === "history" &&
        (loans.length ? (
          loans.map((l) => {
            const [text, tone] = status("loan", l.status);
            return (
              <Card key={l.id} style={{ gap: 6 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={s.h3}>{l.code}</Text>
                  <Badge text={l.isOverdue ? "Quá hạn" : text} tone={l.isOverdue ? "bad" : tone} />
                </View>
                <Text style={s.muted}>Ngày mượn {fmtDate(l.borrowedAt)}</Text>
                {l.items.map((i) => (
                  <Text key={i.id}>
                    • {i.copy.book.title}
                    {i.returnedAt ? ` (trả ${fmtDate(i.returnedAt)})` : ""}
                    {Number(i.fine) ? ` · phạt ${money(i.fine)}` : ""}
                  </Text>
                ))}
              </Card>
            );
          })
        ) : (
          <Empty text="Chưa có lịch sử mượn" />
        ))}
    </ScrollView>
  );
}
