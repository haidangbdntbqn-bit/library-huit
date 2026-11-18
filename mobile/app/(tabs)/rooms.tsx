import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { api, errMsg, type Booking, type Room, type Shift } from "../../src/api";
import { fmtDate, fmtTime, status } from "../../src/format";
import { Badge, Btn, Card, Chip, Empty, colors, s } from "../../src/ui";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const SHIFTS: Shift[] = [
  { start: 7, end: 9, label: "Ca 1 (7h–9h)" },
  { start: 9, end: 11, label: "Ca 2 (9h–11h)" },
  { start: 13, end: 15, label: "Ca 3 (13h–15h)" },
  { start: 15, end: 17, label: "Ca 4 (15h–17h)" },
];

/** Trạng thái một ca của phòng: trống / đã đặt (xanh) / của tôi / đã qua */
function shiftState(room: Room, day: Date, sh: Shift) {
  const a = new Date(day);
  a.setHours(sh.start, 0, 0, 0);
  const b = new Date(day);
  b.setHours(sh.end, 0, 0, 0);
  const list = (room.schedule ?? []).filter((x) => new Date(x.startTime) < b && new Date(x.endTime) > a);
  const used = list.reduce((sum, x) => sum + (x.people ?? 1), 0);
  const reading = room.roomType === "READING";
  if (list.some((x) => x.mine)) return { key: "mine", text: "Lượt của bạn", free: false };
  if (b <= new Date()) return { key: "past", text: "Đã qua", free: false };
  if (room.status === "MAINTENANCE") return { key: "past", text: "Bảo trì", free: false };
  if (reading) return { key: used >= room.capacity ? "booked" : used ? "partial" : "free", text: `Còn ${Math.max(0, room.capacity - used)} chỗ`, free: used < room.capacity };
  if (list.length) return { key: list.every((x) => x.status === "PENDING") ? "pending" : "booked", text: list.every((x) => x.status === "PENDING") ? "Chờ duyệt" : "Đã đặt", free: false };
  return { key: "free", text: "Trống", free: true };
}

const TILE: Record<string, { bg: string; fg: string; border: string }> = {
  free: { bg: colors.surface, fg: colors.text, border: colors.line },
  partial: { bg: colors.bookedSoft, fg: colors.text, border: "#9FD3B2" },
  booked: { bg: colors.booked, fg: "#fff", border: colors.booked },
  pending: { bg: "#C9E8D4", fg: colors.text, border: "#9FD3B2" },
  mine: { bg: colors.primary, fg: "#fff", border: colors.primary },
  past: { bg: "#F1F3F6", fg: "#9AA6BA", border: colors.line },
};

export default function RoomsScreen() {
  const days = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        return d;
      }).filter((d) => d.getDay() !== 0),
    [],
  );
  const [day, setDay] = useState(days[0]);
  const [type, setType] = useState<"GROUP" | "READING">("GROUP");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mine, setMine] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<{ room: Room; shift: Shift } | null>(null);
  const [people, setPeople] = useState("4");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([api.rooms({ date: dateStr, roomType: type }), api.myBookings()]);
      setRooms(r);
      setMine(m);
    } catch (e) {
      Alert.alert("Lỗi", errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [dateStr, type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pick = (room: Room, shift: Shift) => {
    setTarget({ room, shift });
    setPeople(String(room.roomType === "GROUP" ? Math.min(4, room.capacity) : 1));
    setPurpose("");
  };

  const submit = async () => {
    if (!target) return;
    const st = new Date(day);
    st.setHours(target.shift.start, 0, 0, 0);
    const en = new Date(day);
    en.setHours(target.shift.end, 0, 0, 0);
    setSaving(true);
    try {
      const b = await api.book_room({ roomId: target.room.id, startTime: st.toISOString(), endTime: en.toISOString(), people: Number(people), purpose });
      setTarget(null);
      Alert.alert(b.status === "APPROVED" ? "Đặt phòng thành công" : "Đã gửi yêu cầu", b.status === "APPROVED" ? "" : "Vui lòng chờ thư viện duyệt.");
      load();
    } catch (e) {
      Alert.alert("Không đặt được phòng", errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = (b: Booking) =>
    Alert.alert("Hủy lượt đặt phòng?", `${b.room.name} ${fmtTime(b.startTime)}–${fmtTime(b.endTime)} ${fmtDate(b.startTime)}`, [
      { text: "Không" },
      {
        text: "Hủy lượt đặt",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelBooking(b.id);
            load();
          } catch (e) {
            Alert.alert("Lỗi", errMsg(e));
          }
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Phòng học nhóm" active={type === "GROUP"} onPress={() => setType("GROUP")} />
        <Chip label="Phòng đọc" active={type === "READING"} onPress={() => setType("READING")} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {days.map((d) => (
          <Chip key={d.toISOString()} label={`${WEEKDAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`} active={d.getTime() === day.getTime()} onPress={() => setDay(d)} />
        ))}
      </ScrollView>
      <Text style={s.muted}>Phòng hoạt động 7h–17h, mượn theo ca. Ô xanh lá là ca đã có người đặt, ô xanh dương là lượt của bạn; bấm ô trống để đặt.</Text>

      {rooms.map((r) => {
        const [text, tone] = status("roomState", r.currentState);
        return (
          <Card key={r.id} style={{ gap: 10 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={[s.h3, { flex: 1 }]}>{r.name}</Text>
              <Badge text={text} tone={tone} />
            </View>
            <Text style={s.muted}>
              {r.capacity} chỗ · {r.floor ?? ""} · {r.equipment ?? ""}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SHIFTS.map((sh) => {
                const st = shiftState(r, day, sh);
                const c = TILE[st.key];
                return (
                  <Pressable
                    key={sh.start}
                    disabled={!st.free}
                    onPress={() => pick(r, sh)}
                    style={{ width: "47%", flexGrow: 1, backgroundColor: c.bg, borderColor: c.border, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" }}
                  >
                    <Text style={{ fontWeight: "700", color: c.fg }}>
                      {sh.start}h–{sh.end}h
                    </Text>
                    <Text style={{ color: c.fg, fontSize: 13 }}>{st.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        );
      })}
      {!loading && !rooms.length && <Empty text="Chưa có phòng" />}

      <Text style={[s.h3, { marginTop: 12 }]}>Lịch sử mượn phòng</Text>
      {mine.length ? (
        mine.map((b) => {
          const [text, tone] = status("booking", b.status);
          return (
            <Card key={b.id} style={{ gap: 6 }}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={{ fontWeight: "600" }}>{b.room.name}</Text>
                <Badge text={text} tone={tone} />
              </View>
              <Text style={s.muted}>
                {fmtDate(b.startTime)} · ca {fmtTime(b.startTime)}–{fmtTime(b.endTime)} · {b.people} người
              </Text>
              {!!b.note && <Text style={s.muted}>{b.note}</Text>}
              {["PENDING", "APPROVED"].includes(b.status) && new Date(b.endTime) > new Date() && <Btn small variant="danger" title="Hủy" onPress={() => cancel(b)} />}
            </Card>
          );
        })
      ) : (
        <Empty text="Bạn chưa mượn phòng lần nào" />
      )}

      <Modal visible={!!target} animationType="slide" transparent onRequestClose={() => setTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={() => setTarget(null)} />
        <View style={{ backgroundColor: colors.surface, padding: 20, gap: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <Text style={s.title}>{target?.room.name}</Text>
          <Text style={s.muted}>
            {target?.shift.label} · ngày {fmtDate(day.toISOString())}
          </Text>
          <View style={[s.row]}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Số người</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={people} onChangeText={setPeople} />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={s.label}>Mục đích</Text>
              <TextInput style={s.input} value={purpose} onChangeText={setPurpose} placeholder="Họp nhóm đồ án" />
            </View>
          </View>
          <Btn title="Gửi yêu cầu đặt phòng" onPress={submit} loading={saving} />
        </View>
      </Modal>
    </ScrollView>
  );
}
