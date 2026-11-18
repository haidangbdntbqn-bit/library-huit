import { App, Button, Col, DatePicker, Empty, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented, Table, Tabs } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad } from "../../hooks/usePaged";
import { useAuth } from "../../store/auth";
import type { Room, RoomSlot, Shift } from "../../types";
import { fmtDate, fmtTime } from "../../utils/format";

const DEFAULT_SHIFTS: Shift[] = [
  { start: 7, end: 9, label: "Ca 1 (7h–9h)" },
  { start: 9, end: 11, label: "Ca 2 (9h–11h)" },
  { start: 13, end: 15, label: "Ca 3 (13h–15h)" },
  { start: 15, end: 17, label: "Ca 4 (15h–17h)" },
];

/** Các lượt (chưa hủy) rơi vào một ca */
function inShift(slots: RoomSlot[], date: Dayjs, s: Shift) {
  const a = date.hour(s.start).minute(0).second(0);
  const b = date.hour(s.end).minute(0).second(0);
  return slots.filter((x) => dayjs(x.startTime).isBefore(b) && dayjs(x.endTime).isAfter(a));
}

/** Lưới 4 ca của một phòng: ca đã có người đặt tô xanh, ca của bạn tô xanh dương */
function ShiftGrid({ room, date, shifts, onPick }: { room: Room; date: Dayjs; shifts: Shift[]; onPick: (s: Shift) => void }) {
  return (
    <div className="shift-grid">
      {shifts.map((s) => {
        const list = inShift(room.schedule ?? [], date, s);
        const ended = date.hour(s.end).minute(0).isBefore(dayjs());
        const mine = list.some((x) => x.mine);
        const used = list.reduce((sum, x) => sum + x.people, 0);
        const reading = room.roomType === "READING";
        const full = reading ? used >= room.capacity : list.length > 0;
        const pendingOnly = !reading && list.length > 0 && list.every((x) => x.status === "PENDING");
        const cls = mine ? "mine" : ended || room.status === "MAINTENANCE" ? "disabled" : full ? (pendingOnly ? "pending" : "booked") : used ? "partial" : "";
        const text = mine
          ? "Lượt của bạn"
          : ended
            ? "Đã qua"
            : room.status === "MAINTENANCE"
              ? "Bảo trì"
              : reading
                ? `Còn ${Math.max(0, room.capacity - used)}/${room.capacity} chỗ`
                : full
                  ? pendingOnly
                    ? "Chờ duyệt"
                    : "Đã đặt"
                  : "Trống";
        const clickable = !mine && !ended && !full && room.status !== "MAINTENANCE";
        return (
          <button
            key={s.start}
            type="button"
            className={`shift ${cls}`}
            disabled={!clickable}
            onClick={() => clickable && onPick(s)}
            aria-label={`${s.label}: ${text}`}
          >
            <span className="time">
              {s.start}h–{s.end}h
            </span>
            {text}
          </button>
        );
      })}
    </div>
  );
}

export default function Rooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [type, setType] = useState<"GROUP" | "READING">("GROUP");
  const [picked, setPicked] = useState<{ room: Room; shift: Shift } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const shiftsQ = useLoad(() => api.rooms.shifts());
  const shifts = shiftsQ.data?.length ? shiftsQ.data : DEFAULT_SHIFTS;
  const day = date.format("YYYY-MM-DD");
  const rooms = useLoad(() => api.rooms.list({ date: day, roomType: type }), [day, type, user?.id]);
  const mine = useLoad(() => (user?.role === "READER" ? api.bookings.mine() : Promise.resolve([])), [user?.id]);

  const pick = (room: Room, shift: Shift) => {
    if (!user) return navigate("/login", { state: { from: "/rooms" } });
    if (user.role !== "READER") return message.info("Chức năng đặt phòng dành cho bạn đọc");
    form.setFieldsValue({ people: room.roomType === "GROUP" ? Math.min(4, room.capacity) : 1, purpose: "" });
    setPicked({ room, shift });
  };

  const submit = async () => {
    if (!picked) return;
    const v = await form.validateFields();
    setSaving(true);
    try {
      await api.bookings.create({
        roomId: picked.room.id,
        startTime: date.hour(picked.shift.start).minute(0).second(0).millisecond(0).toISOString(),
        endTime: date.hour(picked.shift.end).minute(0).second(0).millisecond(0).toISOString(),
        people: v.people,
        purpose: v.purpose || undefined,
      });
      message.success("Đã gửi yêu cầu đặt phòng, vui lòng chờ thủ thư duyệt");
      setPicked(null);
      rooms.reload();
      mine.reload();
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: number) => {
    try {
      await api.bookings.cancelMine(id);
      message.success("Đã hủy lượt đặt phòng");
      rooms.reload();
      mine.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <PageHeader title="Mượn phòng đọc, phòng học nhóm" subtitle="Phòng hoạt động 7h–17h, mượn theo ca: 7h–9h, 9h–11h, 13h–15h, 15h–17h" />
      <Tabs
        items={[
          {
            key: "rooms",
            label: "Tình trạng phòng",
            children: (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                  <Segmented
                    value={type}
                    onChange={(v) => setType(v as "GROUP" | "READING")}
                    options={[
                      { value: "GROUP", label: "Phòng học nhóm" },
                      { value: "READING", label: "Phòng đọc" },
                    ]}
                  />
                  <DatePicker
                    value={date}
                    onChange={(d) => d && setDate(d)}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    disabledDate={(d) => d.isBefore(dayjs(), "day") || d.day() === 0}
                  />
                </div>
                <div className="shift-legend" style={{ marginBottom: 16 }}>
                  <span><i style={{ background: "#fff" }} />Trống, bấm để đặt</span>
                  <span><i style={{ background: "var(--c-booked)", borderColor: "var(--c-booked)" }} />Đã có người đặt</span>
                  <span><i style={{ background: "repeating-linear-gradient(45deg,#e3f3e8,#e3f3e8 3px,#c9e8d4 3px,#c9e8d4 6px)" }} />Đang chờ duyệt</span>
                  <span><i style={{ background: "var(--c-primary)", borderColor: "var(--c-primary)" }} />Lượt của bạn</span>
                  {type === "READING" && <span><i style={{ background: "var(--c-booked-soft)" }} />Còn chỗ</span>}
                </div>
                {rooms.data?.length ? (
                  <Row gutter={[16, 16]}>
                    {rooms.data.map((r) => (
                      <Col key={r.id} xs={24} md={12} xl={8}>
                        <div className="panel" style={{ height: "100%" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <div>
                              <h3 style={{ margin: 0 }}>{r.name}</h3>
                              <div className="muted" style={{ fontSize: 13 }}>
                                {r.capacity} chỗ · {r.floor ?? ""} {r.equipment ? `· ${r.equipment}` : ""}
                              </div>
                            </div>
                            {date.isSame(dayjs(), "day") && <StatusTag kind="roomState" value={r.currentState} />}
                          </div>
                          <div style={{ marginTop: 14 }}>
                            <ShiftGrid room={r} date={date} shifts={shifts} onPick={(s) => pick(r, s)} />
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="Không có phòng" />
                )}
              </>
            ),
          },
          ...(user?.role === "READER"
            ? [
                {
                  key: "mine",
                  label: "Lịch sử mượn phòng",
                  children: (
                    <Table
                      rowKey="id"
                      loading={mine.loading}
                      dataSource={mine.data ?? []}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 760 }}
                      columns={[
                        { title: "Mã", dataIndex: "code" },
                        { title: "Phòng", render: (_, b) => b.room.name },
                        { title: "Ngày", render: (_, b) => fmtDate(b.startTime) },
                        { title: "Ca", render: (_, b) => `${fmtTime(b.startTime)}–${fmtTime(b.endTime)}` },
                        { title: "Số người", dataIndex: "people" },
                        { title: "Trạng thái", render: (_, b) => <StatusTag kind="booking" value={b.status} /> },
                        { title: "Ghi chú", render: (_, b) => b.note ?? "" },
                        {
                          title: "",
                          align: "right" as const,
                          render: (_, b) =>
                            ["PENDING", "APPROVED"].includes(b.status) && dayjs(b.endTime).isAfter(dayjs()) && (
                              <Popconfirm title="Hủy lượt đặt phòng này?" okText="Hủy lượt" cancelText="Không" onConfirm={() => cancel(b.id)}>
                                <Button danger size="small">
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

      <Modal
        open={!!picked}
        title={picked ? `Đặt ${picked.room.name}` : ""}
        okText="Gửi yêu cầu đặt phòng"
        cancelText="Đóng"
        confirmLoading={saving}
        onOk={submit}
        onCancel={() => setPicked(null)}
        destroyOnClose
      >
        {picked && (
          <p>
            <strong>{picked.shift.label}</strong>, ngày {date.format("DD/MM/YYYY")}
          </p>
        )}
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="people" label="Số người" rules={[{ required: true, message: "Nhập số người" }]}>
            <InputNumber min={1} max={picked?.room.capacity} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="purpose" label="Mục đích (không bắt buộc)">
            <Input.TextArea rows={2} maxLength={300} placeholder="Ví dụ: thảo luận đồ án nhóm" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
