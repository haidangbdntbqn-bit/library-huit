import { App, Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import MajorSelect from "../../components/MajorSelect";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad, usePaged } from "../../hooks/usePaged";
import type { Reader } from "../../types";
import { fmtDate, fmtDateTime, label, money, options } from "../../utils/format";

function ReaderDetail({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { data: r, reload } = useLoad(() => api.readers.get(id), [id]);
  const [form] = Form.useForm();
  if (!r) return null;

  const save = async (v: Record<string, unknown>) => {
    try {
      await api.readers.update(r.id, v);
      message.success("Đã cập nhật đọc giả");
      reload();
      onChanged();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <Tabs
      items={[
        {
          key: "info",
          label: "Thông tin & tình trạng",
          children: (
            <>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="MSSV">{r.studentCode}</Descriptions.Item>
                <Descriptions.Item label="Tài khoản">{r.user?.username}</Descriptions.Item>
                <Descriptions.Item label="Thẻ">
                  {r.card?.cardNumber ?? "—"} <StatusTag kind="card" value={r.card?.status ?? null} />
                </Descriptions.Item>
                <Descriptions.Item label="Hạn thẻ">{fmtDate(r.card?.expiresAt)}</Descriptions.Item>
              </Descriptions>
              <Form
                form={form}
                layout="vertical"
                onFinish={save}
                initialValues={{
                  fullName: r.user?.fullName,
                  email: r.user?.email,
                  phone: r.user?.phone,
                  readerType: r.readerType,
                  majorId: r.majorId,
                  className: r.className,
                  status: r.status,
                  maxBooks: r.maxBooks,
                }}
              >
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="Điện thoại">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="readerType" label="Đối tượng">
                      <Select options={options("readerType")} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="majorId" label="Ngành">
                      <MajorSelect />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="className" label="Lớp">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="status" label="Tình trạng đọc giả">
                      <Select options={options("readerStatus")} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="maxBooks" label="Hạn mức mượn (cuốn)">
                      <InputNumber min={0} max={50} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Space>
                  <Button type="primary" htmlType="submit">
                    Lưu thay đổi
                  </Button>
                  <Button onClick={() => navigate(`/admin/loans/new?code=${r.studentCode}`)}>Lập phiếu mượn</Button>
                </Space>
              </Form>
            </>
          ),
        },
        {
          key: "loans",
          label: "Lịch sử mượn",
          children: (
            <Table
              rowKey="id"
              size="small"
              dataSource={r.loans ?? []}
              columns={[
                { title: "Số phiếu", dataIndex: "code" },
                { title: "Ngày", render: (_, l) => fmtDate(l.borrowedAt) },
                { title: "Sách", render: (_, l) => l.items.map((i) => i.copy.book.title).join("; ") },
                { title: "", render: (_, l) => <StatusTag kind="loan" value={l.status} /> },
              ]}
            />
          ),
        },
        {
          key: "violations",
          label: `Vi phạm (${r.violations?.length ?? 0})`,
          children: (
            <Table
              rowKey="id"
              size="small"
              dataSource={r.violations ?? []}
              columns={[
                { title: "Ngày", render: (_, v) => fmtDate(v.createdAt) },
                { title: "Loại", render: (_, v) => label("violationType", v.type) },
                { title: "Nội dung", dataIndex: "description" },
                { title: "Phạt", render: (_, v) => money(v.fineAmount) },
                { title: "", render: (_, v) => <StatusTag kind="violation" value={v.status} /> },
              ]}
            />
          ),
        },
        {
          key: "bookings",
          label: "Mượn phòng",
          children: (
            <Table
              rowKey="id"
              size="small"
              dataSource={r.bookings ?? []}
              columns={[
                { title: "Phòng", render: (_, b) => b.room.name },
                { title: "Thời gian", render: (_, b) => fmtDateTime(b.startTime) },
                { title: "", render: (_, b) => <StatusTag kind="booking" value={b.status} /> },
              ]}
            />
          ),
        },
      ]}
    />
  );
}

export default function Readers() {
  const { message } = App.useApp();
  const { tableProps, setFilter, reload } = usePaged<Reader>(api.readers.list);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const create = async (v: Record<string, unknown>) => {
    try {
      await api.readers.create(v);
      message.success("Đã thêm đọc giả");
      setCreating(false);
      form.resetFields();
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Đọc giả"
        subtitle="Quản lý tình trạng đọc giả, hạn mức mượn và vi phạm"
        extra={
          <Button type="primary" onClick={() => setCreating(true)}>
            Thêm đọc giả
          </Button>
        }
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="MSSV, họ tên, lớp" allowClear style={{ width: 260 }} onSearch={(q) => setFilter({ q })} />
        <MajorSelect style={{ width: 220 }} onChange={(majorId) => setFilter({ majorId })} />
        <Select allowClear placeholder="Tình trạng" style={{ width: 160 }} options={options("readerStatus")} onChange={(status) => setFilter({ status })} />
      </Space>
      <Table<Reader>
        {...tableProps}
        scroll={{ x: 1000 }}
        onRow={(r) => ({ onClick: () => setDetailId(r.id), style: { cursor: "pointer" } })}
        columns={[
          { title: "MSSV", dataIndex: "studentCode" },
          { title: "Họ tên", render: (_, r) => r.user?.fullName },
          { title: "Đối tượng", render: (_, r) => label("readerType", r.readerType) },
          { title: "Ngành", render: (_, r) => r.major?.name ?? "—" },
          { title: "Lớp", render: (_, r) => r.className ?? "—" },
          { title: "Thẻ", render: (_, r) => <StatusTag kind="card" value={r.card?.status ?? null} /> },
          { title: "Đang mượn", render: (_, r) => `${r.activeLoans ?? 0}/${r.maxBooks}` },
          {
            title: "Vi phạm chưa xử lý",
            render: (_, r) => (r._count?.violations ? <span style={{ color: "var(--c-danger)" }}>{r._count.violations}</span> : 0),
          },
          {
            title: "Tình trạng",
            render: (_, r) => (
              <Space size={4} wrap>
                <StatusTag kind="readerStatus" value={r.status} />
                {r.user?.isActive === false && <Tag color="red">Khóa đăng nhập</Tag>}
              </Space>
            ),
          },
        ]}
      />

      <Drawer width={720} open={detailId !== null} onClose={() => setDetailId(null)} title="Hồ sơ đọc giả" destroyOnClose>
        {detailId && <ReaderDetail id={detailId} onChanged={reload} />}
      </Drawer>

      <Modal open={creating} title="Thêm đọc giả tại quầy" okText="Thêm đọc giả" cancelText="Hủy" onCancel={() => setCreating(false)} onOk={() => form.submit()} width={640}>
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ readerType: "STUDENT" }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="studentCode" label="MSSV / mã cán bộ" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="readerType" label="Đối tượng">
                <Select options={options("readerType")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="majorId" label="Ngành">
                <MajorSelect />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="className" label="Lớp">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Điện thoại">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, pattern: /^[a-zA-Z0-9_.]{4,}$/, message: "Tối thiểu 4 ký tự, không dấu" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="Mật khẩu ban đầu" rules={[{ required: true, min: 6 }]}>
                <Input.Password />
              </Form.Item>
            </Col>
            <Col span={24}>
              <p className="muted" style={{ margin: 0 }}>Thẻ thư viện (thẻ sinh viên, số thẻ = MSSV) được kích hoạt tự động khi tạo đọc giả.</p>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
