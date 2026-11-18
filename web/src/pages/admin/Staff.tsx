import { App, Button, Col, DatePicker, Form, Input, Modal, Row, Select, Switch, Table } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad } from "../../hooks/usePaged";
import type { Staff } from "../../types";
import { fmtDate } from "../../utils/format";

export default function StaffPage() {
  const { message } = App.useApp();
  const { data, loading, reload } = useLoad(() => api.staff.list());
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [form] = Form.useForm();

  const open = (s: Staff | "new") => {
    setEditing(s);
    form.resetFields();
    if (s !== "new")
      form.setFieldsValue({
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        position: s.position,
        hiredAt: s.hiredAt ? dayjs(s.hiredAt) : undefined,
        isActive: s.user.isActive,
      });
  };

  const save = async (v: Record<string, unknown> & { hiredAt?: dayjs.Dayjs }) => {
    const body = { ...v, hiredAt: v.hiredAt ? v.hiredAt.toISOString() : undefined };
    try {
      if (editing === "new") await api.staff.create(body);
      else if (editing) await api.staff.update(editing.id, body);
      message.success("Đã lưu nhân viên");
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const isNew = editing === "new";

  return (
    <>
      <PageHeader title="Nhân viên thư viện" subtitle="Mỗi nhân viên có một tài khoản đăng nhập vai trò Thủ thư hoặc Quản trị" extra={<Button type="primary" onClick={() => open("new")}>Thêm nhân viên</Button>} />
      <Table<Staff>
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        columns={[
          { title: "Mã NV", dataIndex: "staffCode" },
          { title: "Họ tên", render: (_, s) => s.user.fullName },
          { title: "Chức vụ", dataIndex: "position" },
          { title: "Tài khoản", render: (_, s) => s.user.username },
          { title: "Vai trò", render: (_, s) => <StatusTag kind="role" value={s.user.role} /> },
          { title: "Ngày vào làm", render: (_, s) => fmtDate(s.hiredAt) },
          { title: "Phiếu đã lập", render: (_, s) => s._count?.loans ?? 0 },
          { title: "Hoạt động", render: (_, s) => (s.user.isActive ? "Có" : "Đã khóa") },
          { title: "", render: (_, s) => <Button size="small" onClick={() => open(s)}>Sửa</Button> },
        ]}
      />
      <Modal open={editing !== null} title={isNew ? "Thêm nhân viên" : "Sửa nhân viên"} okText="Lưu" cancelText="Hủy" width={640} onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ role: "LIBRARIAN", isActive: true }}>
          <Row gutter={12}>
            {isNew && (
              <>
                <Col span={8}>
                  <Form.Item name="staffCode" label="Mã nhân viên" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, pattern: /^[a-zA-Z0-9_.]{4,}$/, message: "Tối thiểu 4 ký tự, không dấu" }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
                    <Input.Password />
                  </Form.Item>
                </Col>
              </>
            )}
            <Col span={12}>
              <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Chức vụ" rules={[{ required: true }]}>
                <Input placeholder="Thủ thư quầy lưu hành" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Điện thoại">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hiredAt" label="Ngày vào làm">
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {isNew ? (
                <Form.Item name="role" label="Vai trò">
                  <Select
                    options={[
                      { value: "LIBRARIAN", label: "Thủ thư" },
                      { value: "ADMIN", label: "Quản trị" },
                    ]}
                  />
                </Form.Item>
              ) : (
                <Form.Item name="isActive" label="Cho phép đăng nhập" valuePropName="checked">
                  <Switch />
                </Form.Item>
              )}
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
