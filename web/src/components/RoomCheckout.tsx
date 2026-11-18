import { PlusOutlined } from "@ant-design/icons";
import { Alert, App, Button, Checkbox, Descriptions, Input, InputNumber, Modal, Radio, Skeleton, Space, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { errMsg } from "../api/client";
import type { InspectState, RoomBooking, RoomInspectItem } from "../types";
import { fmtDate, fmtDateTime, fmtTime, money } from "../utils/format";

const STATE_OPTIONS: Array<{ value: InspectState; label: string }> = [
  { value: "OK", label: "Bình thường" },
  { value: "DAMAGED", label: "Hư hỏng" },
  { value: "LOST", label: "Bị mất" },
];
const STATE_TAG: Record<InspectState, { text: string; color: string }> = {
  OK: { text: "Bình thường", color: "green" },
  DAMAGED: { text: "Hư hỏng", color: "volcano" },
  LOST: { text: "Bị mất", color: "red" },
};

type Row = RoomInspectItem & { key: number; custom?: boolean };

function BookingInfo({ b }: { b: RoomBooking }) {
  return (
    <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
      <Descriptions.Item label="Phòng">{b.room.name}</Descriptions.Item>
      <Descriptions.Item label="Mã lượt">{b.code}</Descriptions.Item>
      <Descriptions.Item label="Bạn đọc">
        {b.reader?.user.fullName} ({b.reader?.studentCode})
      </Descriptions.Item>
      <Descriptions.Item label="Ca">
        {fmtDate(b.startTime)} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)} · {b.people} người
      </Descriptions.Item>
    </Descriptions>
  );
}

/**
 * Trả phòng: thủ thư kiểm tra từng thiết bị, đồ đạc trong phòng.
 * Mục hư hỏng / bị mất được lập vi phạm kèm tiền phạt cho bạn đọc đã mượn phòng.
 */
export default function RoomCheckout({ booking, onClose, onDone }: { booking: RoomBooking | null; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [fees, setFees] = useState({ DAMAGED: 100000, LOST: 300000 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintenance, setMaintenance] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setNote("");
    setMaintenance(true);
    api.bookings
      .checklist(booking.id)
      .then((r) => {
        setFees(r.fees);
        setRows(r.items.map((name, i) => ({ key: i, name, state: "OK" })));
      })
      .catch((e) => message.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [booking, message]);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const issues = useMemo(() => rows.filter((r) => r.state !== "OK"), [rows]);
  const total = issues.reduce((s, r) => s + Number(r.fee ?? 0), 0);

  const submit = async () => {
    if (!booking) return;
    if (rows.some((r) => !r.name.trim())) return message.warning("Nhập tên cho các mục thêm mới");
    setSaving(true);
    try {
      await api.bookings.checkout(booking.id, {
        items: rows.map(({ name, state, fee, note }) => ({ name, state, fee: state === "OK" ? 0 : fee ?? null, note: note || null })),
        maintenance,
        note: note || undefined,
      });
      message.success(issues.length ? `Đã trả phòng, lập ${issues.length} vi phạm (${money(total)})` : "Đã trả phòng, phòng bình thường");
      onDone();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!booking}
      width={820}
      title="Trả phòng – kiểm tra tình trạng phòng"
      onCancel={onClose}
      destroyOnClose
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} disabled={loading} onClick={submit}>
            {issues.length ? `Xác nhận trả phòng, phạt ${money(total)}` : "Xác nhận trả phòng"}
          </Button>
        </Space>
      }
    >
      {booking && <BookingInfo b={booking} />}
      {loading ? (
        <Skeleton active />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="muted">Kiểm tra từng mục, đánh dấu mục bị hư hỏng hoặc bị mất.</span>
            <Button size="small" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, state: "OK", fee: null, note: null })))}>
              Tất cả bình thường
            </Button>
          </div>
          <Table<Row>
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={rows}
            rowClassName={(r) => (r.state === "OK" ? "" : "inspect-issue")}
            columns={[
              {
                title: "Thiết bị, đồ đạc",
                width: 200,
                render: (_, r) =>
                  r.custom ? (
                    <Input size="small" placeholder="Tên đồ vật" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} />
                  ) : (
                    <strong>{r.name}</strong>
                  ),
              },
              {
                title: "Tình trạng",
                width: 270,
                render: (_, r) => (
                  <Radio.Group
                    size="small"
                    optionType="button"
                    buttonStyle="solid"
                    options={STATE_OPTIONS}
                    value={r.state}
                    onChange={(e) => {
                      const state = e.target.value as InspectState;
                      update(r.key, { state, fee: state === "OK" ? null : fees[state] });
                    }}
                  />
                ),
              },
              {
                title: "Tiền phạt",
                width: 140,
                render: (_, r) => (
                  <InputNumber
                    size="small"
                    min={0}
                    step={10000}
                    disabled={r.state === "OK"}
                    value={r.state === "OK" ? null : r.fee}
                    style={{ width: "100%" }}
                    formatter={(v) => (v == null ? "" : Number(v).toLocaleString("vi-VN"))}
                    parser={(v) => Number((v ?? "").replace(/\D/g, ""))}
                    onChange={(v) => update(r.key, { fee: v ?? 0 })}
                  />
                ),
              },
              {
                title: "Ghi chú",
                render: (_, r) => (
                  <Input
                    size="small"
                    disabled={r.state === "OK"}
                    placeholder={r.state === "OK" ? "" : "Ví dụ: vỡ góc, gãy chân"}
                    value={r.note ?? ""}
                    onChange={(e) => update(r.key, { note: e.target.value })}
                  />
                ),
              },
            ]}
          />
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            style={{ marginTop: 8 }}
            onClick={() => setRows((rs) => [...rs, { key: Date.now(), name: "", state: "DAMAGED", fee: fees.DAMAGED, custom: true }])}
          >
            Thêm mục khác
          </Button>

          <div style={{ marginTop: 16 }}>
            {issues.length ? (
              <Alert
                type="warning"
                showIcon
                message={`Phát sinh ${issues.length} mục hư hỏng / bị mất, tổng phạt ${money(total)}`}
                description={
                  <>
                    Hệ thống sẽ lập vi phạm cho bạn đọc {booking?.reader?.user.fullName}; bạn đọc nộp phạt tại quầy (trang Vi phạm).
                    <div style={{ marginTop: 8 }}>
                      <Checkbox checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)}>
                        Chuyển phòng sang <strong>Bảo trì</strong> để sửa chữa, tạm ngưng cho mượn
                      </Checkbox>
                    </div>
                  </>
                }
              />
            ) : (
              <Alert type="success" showIcon message="Phòng đầy đủ, bình thường – không phát sinh phạt" />
            )}
            <Input.TextArea style={{ marginTop: 12 }} rows={2} maxLength={150} placeholder="Ghi chú thêm (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </>
      )}
    </Modal>
  );
}

/** Đọc danh sách kiểm tra đã lưu (JSON) */
export function parseInspection(b: RoomBooking): RoomInspectItem[] {
  try {
    return b.inspection ? (JSON.parse(b.inspection) as RoomInspectItem[]) : [];
  } catch {
    return [];
  }
}

/** Xem lại kết quả kiểm tra phòng của một lượt đã trả */
export function RoomInspectionView({ booking, onClose }: { booking: RoomBooking | null; onClose: () => void }) {
  const items = booking ? parseInspection(booking) : [];
  return (
    <Modal open={!!booking} title="Kết quả kiểm tra phòng khi trả" footer={null} width={720} onCancel={onClose}>
      {booking && (
        <>
          <BookingInfo b={booking} />
          <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Trả phòng lúc">{fmtDateTime(booking.checkedOutAt)}</Descriptions.Item>
            <Descriptions.Item label="Người kiểm tra">{booking.inspectedBy ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Kết luận">
              {booking.roomCondition === "ISSUE" ? <Tag color="volcano">Có hư hỏng / mất đồ</Tag> : <Tag color="green">Bình thường</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng phạt">{money(booking.damageFee)}</Descriptions.Item>
          </Descriptions>
          {items.length ? (
            <Table<RoomInspectItem>
              rowKey="name"
              size="small"
              pagination={false}
              dataSource={items}
              columns={[
                { title: "Thiết bị, đồ đạc", dataIndex: "name" },
                { title: "Tình trạng", render: (_, i) => <Tag color={STATE_TAG[i.state].color}>{STATE_TAG[i.state].text}</Tag> },
                { title: "Tiền phạt", render: (_, i) => (i.state === "OK" ? "" : money(i.fee)) },
                { title: "Ghi chú", render: (_, i) => i.note ?? "" },
              ]}
            />
          ) : (
            <div className="muted">{booking.note ?? "Không có chi tiết kiểm tra"}</div>
          )}
        </>
      )}
    </Modal>
  );
}
