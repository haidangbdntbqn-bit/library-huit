import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { api, errMsg, type Material, type MaterialSuggest, type Order } from "../src/api";
import { fmtDate, money, status } from "../src/format";
import { Badge, Btn, Card, Chip, Empty, colors, s } from "../src/ui";

export default function StoreScreen() {
  const [tab, setTab] = useState<"list" | "orders">("list");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cat, setCat] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState<"CASH" | "TRANSFER">("CASH");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Chi tiết + gợi ý (giống trang sản phẩm khi mua sắm)
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MaterialSuggest | null>(null);
  const [known, setKnown] = useState<Record<number, Material>>({});

  useEffect(() => {
    if (!detailId) return setDetail(null);
    setDetail(null);
    api
      .materialSuggest(detailId)
      .then((d) => {
        setDetail(d);
        const extra = [d.material, ...d.related, ...d.boughtTogether, ...d.sameFaculty, ...d.forYou];
        setKnown((k) => ({ ...k, ...Object.fromEntries(extra.map((m) => [m.id, m])) }));
      })
      .catch((e) => Alert.alert("Lỗi", errMsg(e)));
  }, [detailId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, o] = await Promise.all([api.materials(), api.myOrders()]);
      setMaterials(m.items);
      setKnown((k) => ({ ...k, ...Object.fromEntries(m.items.map((x) => [x.id, x])) }));
      setOrders(o);
    } catch (e) {
      Alert.alert("Lỗi", errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = (m: Material, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[m.id] ?? 0) + delta);
      if (m.format === "PRINT" && next > m.stock) return c;
      const copy = { ...c, [m.id]: next };
      if (!next) delete copy[m.id];
      return copy;
    });

  const total = Object.entries(cart).reduce((sum, [id, q]) => sum + Number(known[Number(id)]?.price ?? 0) * Number(q), 0);

  const shelf = (title: string, items: Material[]) =>
    items.length > 0 && (
      <View style={{ gap: 8 }}>
        <Text style={s.h3}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {items.map((m) => (
            <Pressable key={m.id} onPress={() => setDetailId(m.id)} style={{ width: 130, gap: 6 }}>
              <View style={{ height: 150, borderRadius: 8, backgroundColor: colors.primary, padding: 10, justifyContent: "space-between" }}>
                <Text style={{ color: "#fff", fontSize: 11 }}>{status("category", m.category)[0]}</Text>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }} numberOfLines={5}>
                  {m.title}
                </Text>
              </View>
              <Text numberOfLines={2} style={{ fontWeight: "600", fontSize: 13 }}>
                {m.title}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{money(m.price)}</Text>
              <Btn small title={m.format === "PRINT" && m.stock === 0 ? "Hết hàng" : "+ Giỏ"} disabled={m.format === "PRINT" && (cart[m.id] ?? 0) >= m.stock} onPress={() => change(m, 1)} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );

  const checkout = async () => {
    setSaving(true);
    try {
      const o = await api.createOrder({
        items: Object.entries(cart).map(([id, quantity]) => ({ materialId: Number(id), quantity })),
        paymentMethod: payment,
      });
      setCart({});
      Alert.alert(
        `Đã đặt đơn ${o.code}`,
        payment === "CASH" ? `Thanh toán ${money(o.totalAmount)} tại quầy thư viện để nhận tài liệu.` : `Chuyển khoản ${money(o.totalAmount)} với nội dung ${o.code}.`,
      );
      setTab("orders");
      load();
    } catch (e) {
      Alert.alert("Không đặt được", errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: number) => {
    try {
      await api.cancelOrder(id);
      load();
    } catch (e) {
      Alert.alert("Lỗi", errMsg(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 140 }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Danh mục" active={tab === "list"} onPress={() => setTab("list")} />
          <Chip label={`Đơn của tôi (${orders.length})`} active={tab === "orders"} onPress={() => setTab("orders")} />
        </View>
        {tab === "list" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              ["", "Tất cả"],
              ["GIAO_TRINH", "Giáo trình"],
              ["SACH_THAM_KHAO", "Sách tham khảo"],
              ["BAI_GIANG", "Bài giảng"],
            ].map(([k, l]) => (
              <Chip key={k} label={l} active={cat === k} onPress={() => setCat(k)} />
            ))}
          </ScrollView>
        )}
        {tab === "list" &&
          (materials.filter((m) => !cat || m.category === cat).length ? (
            materials
              .filter((m) => !cat || m.category === cat)
              .map((m) => (
              <Card key={m.id} style={{ gap: 6 }}>
                <Pressable onPress={() => setDetailId(m.id)} style={{ gap: 6 }} accessibilityRole="button" accessibilityLabel={`Xem chi tiết ${m.title}`}>
                <Badge text={status("category", m.category)[0]} tone={status("category", m.category)[1]} />
                <Text style={s.h3}>{m.title}</Text>
                <Text style={{ color: colors.primary, fontSize: 13 }}>Xem chi tiết và gợi ý ›</Text>
                </Pressable>
                <Text style={s.muted}>
                  {m.lecturer ?? ""} · {m.format === "PRINT" ? `Bản in, còn ${m.stock}` : "Bản số (PDF)"}
                </Text>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontSize: 17, fontWeight: "700" }}>{money(m.price)}</Text>
                  <View style={s.row}>
                    <Btn small variant="outline" title="−" onPress={() => change(m, -1)} disabled={!cart[m.id]} />
                    <Text style={{ minWidth: 20, textAlign: "center" }}>{cart[m.id] ?? 0}</Text>
                    <Btn small title="+" onPress={() => change(m, 1)} disabled={m.format === "PRINT" && (cart[m.id] ?? 0) >= m.stock} />
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Empty text="Chưa có sách, tài liệu đang bán" />
          ))}
        {tab === "orders" &&
          (orders.length ? (
            orders.map((o) => {
              const [t, tone] = status("order", o.status);
              return (
                <Card key={o.id} style={{ gap: 6 }}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={s.h3}>{o.code}</Text>
                    <Badge text={t} tone={tone} />
                  </View>
                  <Text style={s.muted}>{fmtDate(o.createdAt)}</Text>
                  {o.items.map((i, idx) => (
                    <Text key={idx}>
                      • {i.material.title} ×{i.quantity}
                    </Text>
                  ))}
                  <Text style={{ fontWeight: "700" }}>{money(o.totalAmount)}</Text>
                  {o.status === "PENDING" && <Btn small variant="danger" title="Hủy đơn" onPress={() => cancel(o.id)} />}
                </Card>
              );
            })
          ) : (
            <Empty text="Bạn chưa có đơn hàng nào" />
          ))}
      </ScrollView>
      {tab === "list" && total > 0 && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="Tiền mặt tại quầy" active={payment === "CASH"} onPress={() => setPayment("CASH")} />
            <Chip label="Chuyển khoản" active={payment === "TRANSFER"} onPress={() => setPayment("TRANSFER")} />
          </View>
          <Btn title={`Đặt mua · ${money(total)}`} onPress={checkout} loading={saving} />
        </View>
      )}

      <Modal visible={detailId !== null} animationType="slide" onRequestClose={() => setDetailId(null)}>
        <ScrollView contentContainerStyle={[s.content, { paddingTop: 56, paddingBottom: 40 }]}>
          <Btn small variant="outline" title="‹ Đóng" onPress={() => setDetailId(null)} />
          {!detail ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <>
              <Card style={{ gap: 8 }}>
                <Badge text={status("category", detail.material.category)[0]} tone={status("category", detail.material.category)[1]} />
                <Text style={s.title}>{detail.material.title}</Text>
                <Text style={s.muted}>{detail.material.lecturer ?? ""}</Text>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.primary }}>{money(detail.material.price)}</Text>
                <Text>
                  {detail.material.major ? `${detail.material.major.name} · ${detail.facultyName}` : "Dùng chung các ngành"}
                </Text>
                <Text style={s.muted}>
                  {detail.material.format === "PRINT" ? `Bản in, còn ${detail.material.stock} cuốn` : "Bản số (PDF)"} · Đã bán {detail.material.sold}
                </Text>
                {!!detail.material.description && <Text>{detail.material.description}</Text>}
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text>Trong giỏ: {cart[detail.material.id] ?? 0}</Text>
                  <View style={s.row}>
                    <Btn small variant="outline" title="−" onPress={() => change(detail.material, -1)} disabled={!cart[detail.material.id]} />
                    <Btn small title="Thêm vào giỏ" onPress={() => change(detail.material, 1)} disabled={detail.material.format === "PRINT" && (cart[detail.material.id] ?? 0) >= detail.material.stock} />
                  </View>
                </View>
              </Card>
              {shelf("Sách, tài liệu liên quan", detail.related)}
              {shelf("Thường được mua cùng", detail.boughtTogether)}
              {shelf(`Bán chạy cùng ${detail.facultyName}`, detail.sameFaculty)}
              {shelf("Dành cho ngành của bạn", detail.forYou)}
              {total > 0 && <Btn title={`Đặt mua · ${money(total)}`} onPress={() => { setDetailId(null); checkout(); }} loading={saving} />}
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}
