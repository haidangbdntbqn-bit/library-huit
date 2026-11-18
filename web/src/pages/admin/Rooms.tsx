import { App, Button, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tabs, Tag, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import RoomCheckout, { RoomInspectionView } from "../../components/RoomCheckout";
import StatusTag from "../../components/StatusTag";
import { useLoad, usePaged } from "../../hooks/usePaged";
import type { Room, RoomBooking } from "../../types";
import { fmtDate, fmtTime, label, money, options } from "../../utils/format";

type Action = "approve" | "reject" | "checkin" | "checkout" | "cancel";
const ACTIONS: Record<string, Array<{ action: Action; text: string; danger?: boolean; primary?: boolean }>> = {
  PENDING: [
    { action: "approve", text: "Duyệt", primary: true },
    { action: "reject", text: "Từ chối", danger: true },
  ],
  APPROVED: [
    { action: "checkin", text: "Nhận phòng", primary: true },
    { action: "cancel", text: "Hủy (vắng mặt)", danger: true },
  ],
  IN_USE: [{ action: "checkout", text: "Trả phòng", primary: true }],
};

function Bookings() {
  const { message } = App.useApp();
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const { tableProps, setFilter, reload } = usePaged<RoomBooking>(api.bookings.list, { date: dayjs().format("YYYY-MM-DD") }, 15);
  const [checkingOut, setCheckingOut] = useState<RoomBooking | null>(null);
  const [viewing, setViewing] = useState<RoomBooking | null>(null);

  const act = async (b: RoomBooking, action: Action) => {
    if (action === "checkout") return setCheckingOut(b); // trả phòng phải kiểm tra tình trạng phòng
    try {
      await api.bookings.action(b.id, action);
      message.success("Đã cập nhật lượt mượn phòng");
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker
          value={date}
          format="DD/MM/YYYY"
          placeholder="Tất cả ngày"
          onChange={(d) => {
            setDate(d);
            setFilter({ date: d ? d.format("YYYY-MM-DD") : undefined });
          }}
        />
        <Select allowClear placeholder="Trạng thái" style={{ width: 180 }} options={options("booking")} onChange={(status) => setFilter({ status })} />
        <Input.Search placeholder="Mã, MSSV, họ tên" allowClear style={{ width: 240 }} onSearch={(q) => setFilter({ q })} />
      </Space>
      <Table<RoomBooking>
        {...tableProps}
        scroll={{ x: 1000 }}
        columns={[
          { title: "Mã", dataIndex: "code" },
          { title: "Phòng", render: (_, b) => b.room.name },
          { title: "Ngày", render: (_, b) => fmtDate(b.startTime) },
          { title: "Giờ", render: (_, b) => `${fmtTime(b.startTime)}–${fmtTime(b.endTime)}` },
          { title: "Bạn đọc", render: (_, b) => `${b.reader?.user.fullName} (${b.reader?.studentCode})` },
          { title: "Số người", dataIndex: "people" },
          { title: "Mục đích", render: (_, b) => b.purpose ?? "" },
          { title: "Trạng thái", render: (_, b) => <StatusTag kind="booking" value={b.status} /> },
          {
            title: "Kiểm tra khi trả",
            render: (_, b) =>
              b.status !== "COMPLETED" ? null : b.roomCondition === "ISSUE" ? (
                <Tooltip title={b.note}>
                  <Tag color="volcano" style={{ cursor: "pointer" }} onClick={() => setViewing(b)}>
                    Hư hỏng / mất · {money(b.damageFee)}
                  </Tag>
                </Tooltip>
              ) : b.roomCondition === "GOOD" ? (
                <Tag color="green" style={{ cursor: "pointer" }} onClick={() => setViewing(b)}>
                  Bình thường
                </Tag>
              ) : (
                <span className="muted">Chưa ghi nhận</span>
              ),
          },
          {
            title: "",
            render: (_, b) => (
              <Space>
                {(ACTIONS[b.status] ?? []).map((a) =>
                  a.danger ? (
                    <Popconfirm key={a.action} title={`${a.text} lượt mượn này?`} okText={a.text} cancelText="Không" onConfirm={() => act(b, a.action)}>
                      <Button size="small" danger>
                        {a.text}
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button key={a.action} size="small" type={a.primary ? "primary" : "default"} onClick={() => act(b, a.action)}>
                      {a.text}
                    </Button>
                  ),
                )}
              </Space>
            ),
          },
        ]}
      />
      <RoomCheckout
        booking={checkingOut}
        onClose={() => setCheckingOut(null)}
        onDone={() => {
          setCheckingOut(null);
          reload();
        }}
      />
      <RoomInspectionView booking={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

function RoomList() {
  const { message } = App.useApp();
  const { data, loading, reload } = useLoad(() => api.rooms.list());
  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [form] = Form.useForm();

  const open = (r: Room | "new") => {
    setEditing(r);
    form.resetFields();
    if (r !== "new") form.setFieldsValue(r);
  };

  const save = async (v: Record<string, unknown>) => {
    try {
      if (editing === "new") await api.rooms.create(v);
      else if (editing) await api.rooms.update(editing.id, v);
      message.success("Đã lưu phòng");
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => open("new")}>
        Thêm phòng
      </Button>
      <Table<Room>
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        pagination={false}
        columns={[
          { title: "Mã", dataIndex: "code" },
          { title: "Tên phòng", dataIndex: "name" },
          { title: "Loại", render: (_, r) => label("roomType", r.roomType) },
          { title: "Sức chứa", dataIndex: "capacity" },
          { title: "Vị trí", dataIndex: "floor" },
          { title: "Thiết bị", dataIndex: "equipment" },
          { title: "Tình trạng lúc này", render: (_, r) => <StatusTag kind="roomState" value={r.currentState} /> },
          { title: "", render: (_, r) => <Button size="small" onClick={() => open(r)}>Sửa</Button> },
        ]}
      />
      <Modal open={editing !== null} title={editing === "new" ? "Thêm phòng" : "Sửa phòng"} okText="Lưu" cancelText="Hủy" onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ roomType: "GROUP", status: "AVAILABLE", capacity: 6 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="Mã phòng" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên phòng" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roomType" label="Loại phòng">
                <Select options={options("roomType")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="capacity" label="Sức chứa (người)" rules={[{ required: true }]}>
                <InputNumber min={1} max={500} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="floor" label="Vị trí">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Tình trạng">
                <Select
                  options={[
                    { value: "AVAILABLE", label: "Hoạt động" },
                    { value: "MAINTENANCE", label: "Bảo trì" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="equipment" label="Thiết bị">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

export default function Rooms() {
  return (
    <>
      <PageHeader title="Phòng đọc, phòng học nhóm" subtitle="Duyệt đặt phòng, nhận phòng, trả phòng (kiểm tra tình trạng phòng) và quản lý danh sách phòng" />
      <Tabs
        items={[
          { key: "bookings", label: "Lịch mượn phòng", children: <Bookings /> },
          { key: "rooms", label: "Danh sách phòng", children: <RoomList /> },
        ]}
      />
    </>
  );
}
