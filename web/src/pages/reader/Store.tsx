import { DeleteOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { App, Badge, Button, Col, Drawer, Empty, Input, InputNumber, Popconfirm, Radio, Row, Segmented, Table, Tabs, Tag } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import MajorSelect from "../../components/MajorSelect";
import MaterialDetail, { MaterialCover } from "../../components/MaterialDetail";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad } from "../../hooks/usePaged";
import { useAuth } from "../../store/auth";
import type { Material } from "../../types";
import { fmtDateTime, label, money } from "../../utils/format";

type CartItem = { material: Material; quantity: number };

export default function Store() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [q, setQ] = useState("");
  const [majorId, setMajorId] = useState<number>();
  const [category, setCategory] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [payment, setPayment] = useState<"CASH" | "TRANSFER">("CASH");
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const materials = useLoad(() => api.materials.list({ q, majorId, category, pageSize: 200 }), [q, majorId, category]);
  const orders = useLoad(() => (user?.role === "READER" ? api.orders.mine() : Promise.resolve([])), [user?.id]);
  const total = cart.reduce((s, i) => s + Number(i.material.price) * i.quantity, 0);

  const add = (m: Material) => {
    if (!user) return navigate("/login", { state: { from: "/store" } });
    setCart((c) => {
      const found = c.find((i) => i.material.id === m.id);
      if (found) return c.map((i) => (i.material.id === m.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...c, { material: m, quantity: 1 }];
    });
    message.success("Đã thêm vào giỏ");
  };

  const checkout = async () => {
    setSaving(true);
    try {
      const order = await api.orders.create({
        items: cart.map((i) => ({ materialId: i.material.id, quantity: i.quantity })),
        paymentMethod: payment,
      });
      setCart([]);
      setCartOpen(false);
      orders.reload();
      materials.reload();
      modal.success({
        title: `Đã đặt đơn ${order.code}`,
        content:
          payment === "CASH"
            ? `Vui lòng thanh toán ${money(order.totalAmount)} tại quầy thư viện và nhận tài liệu.`
            : `Chuyển khoản ${money(order.totalAmount)} với nội dung "${order.code}". Thư viện sẽ xác nhận khi nhận được tiền.`,
      });
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async (id: number) => {
    try {
      await api.orders.cancelMine(id);
      message.success("Đã hủy đơn hàng");
      orders.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <PageHeader
        title="Nhà sách thư viện"
        subtitle="Giáo trình, sách tham khảo và tài liệu bài giảng – đặt mua trực tuyến, thanh toán và nhận tại quầy"
        extra={
          user?.role === "READER" && (
            <Badge count={cart.length}>
              <Button icon={<ShoppingCartOutlined />} onClick={() => setCartOpen(true)}>
                Giỏ hàng
              </Button>
            </Badge>
          )
        }
      />
      <Tabs
        items={[
          {
            key: "list",
            label: "Sách và tài liệu",
            children: (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  <Segmented
                    value={category}
                    onChange={(v) => setCategory(String(v))}
                    options={[
                      { value: "", label: "Tất cả" },
                      { value: "GIAO_TRINH", label: "Giáo trình" },
                      { value: "SACH_THAM_KHAO", label: "Sách tham khảo" },
                      { value: "BAI_GIANG", label: "Tài liệu bài giảng" },
                    ]}
                  />
                  <Input.Search placeholder="Tên sách, tác giả, giảng viên…" style={{ maxWidth: 320 }} onSearch={setQ} allowClear />
                  <MajorSelect style={{ width: 240 }} value={majorId} onChange={setMajorId} />
                </div>
                <Row gutter={[16, 16]}>
                  {(materials.data?.items ?? []).map((m) => (
                    <Col key={m.id} xs={24} sm={12} lg={8}>
                      <div
                        className="panel store-card"
                        role="button"
                        tabIndex={0}
                        aria-label={`Xem chi tiết ${m.title}`}
                        onClick={() => setDetailId(m.id)}
                        onKeyDown={(e) => e.key === "Enter" && setDetailId(m.id)}
                        style={{ height: "100%", display: "flex", gap: 14 }}
                      >
                        <div style={{ width: 84, flexShrink: 0 }}>
                          <MaterialCover m={m} />
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                        <div>
                          <StatusTag kind="category" value={m.category} />
                          <Tag>{label("format", m.format)}</Tag>
                          {m.major && <Tag>{m.major.name}</Tag>}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{m.title}</div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {m.lecturer ?? ""} {m.format === "PRINT" && `· Còn ${m.stock} cuốn`}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                          <span className="display" style={{ fontSize: 20 }}>
                            {money(m.price)}
                          </span>
                          <Button
                            type="primary"
                            disabled={m.format === "PRINT" && m.stock === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              add(m);
                            }}
                          >
                            {m.format === "PRINT" && m.stock === 0 ? "Hết hàng" : "Thêm vào giỏ"}
                          </Button>
                        </div>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
                {!materials.loading && !materials.data?.items.length && <Empty description="Không có tài liệu phù hợp" />}
              </>
            ),
          },
          ...(user?.role === "READER"
            ? [
                {
                  key: "orders",
                  label: "Đơn hàng của tôi",
                  children: (
                    <Table
                      rowKey="id"
                      loading={orders.loading}
                      dataSource={orders.data ?? []}
                      scroll={{ x: 720 }}
                      columns={[
                        { title: "Mã đơn", dataIndex: "code" },
                        { title: "Ngày đặt", render: (_, o) => fmtDateTime(o.createdAt) },
                        { title: "Tài liệu", render: (_, o) => o.items.map((i) => `${i.material.title} ×${i.quantity}`).join(", ") },
                        { title: "Tổng tiền", render: (_, o) => money(o.totalAmount) },
                        { title: "Thanh toán", render: (_, o) => label("payment", o.paymentMethod) },
                        { title: "Trạng thái", render: (_, o) => <StatusTag kind="order" value={o.status} /> },
                        {
                          title: "",
                          render: (_, o) =>
                            o.status === "PENDING" && (
                              <Popconfirm title="Hủy đơn hàng này?" okText="Hủy đơn" cancelText="Không" onConfirm={() => cancelOrder(o.id)}>
                                <Button size="small" danger>
                                  Hủy
                                </Button>
                              </Popconfirm>
                            ),
                        },
                      ]}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />

      <MaterialDetail id={detailId} onClose={() => setDetailId(null)} onAdd={add} />

      <Drawer
        title="Giỏ hàng"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        width={420}
        footer={
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Radio.Group value={payment} onChange={(e) => setPayment(e.target.value)}>
              <Radio value="CASH">Tiền mặt tại quầy</Radio>
              <Radio value="TRANSFER">Chuyển khoản</Radio>
            </Radio.Group>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}>
              <span>Tổng cộng</span>
              <strong>{money(total)}</strong>
            </div>
            <Button type="primary" size="large" disabled={!cart.length} loading={saving} onClick={checkout}>
              Đặt mua
            </Button>
          </div>
        }
      >
        {cart.length === 0 ? (
          <Empty description="Giỏ hàng trống" />
        ) : (
          cart.map((i) => (
            <div key={i.material.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--c-line)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.material.title}</div>
                <div className="muted">{money(i.material.price)}</div>
              </div>
              <InputNumber
                min={1}
                max={i.material.format === "PRINT" ? i.material.stock : 50}
                value={i.quantity}
                aria-label="Số lượng"
                onChange={(v) => setCart((c) => c.map((x) => (x.material.id === i.material.id ? { ...x, quantity: v ?? 1 } : x)))}
              />
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Xóa" onClick={() => setCart((c) => c.filter((x) => x.material.id !== i.material.id))} />
            </div>
          ))
        )}
      </Drawer>
    </div>
  );
}
