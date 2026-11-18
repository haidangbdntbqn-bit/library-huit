import { App, Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table } from "antd";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import { useAuth } from "../../store/auth";
import type { UserInfo } from "../../types";
import { fmtDate, options } from "../../utils/format";

type Row = UserInfo & { reader?: { studentCode: string }; staff?: { staffCode: string } };

export default function Users() {
  const { message, modal } = App.useApp();
  const { user: me } = useAuth();
  const { tableProps, setFilter, reload } = usePaged<Row>(api.users.list);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const update = async (u: Row, body: Record<string, unknown>, ok: string) => {
    try {
      await api.users.update(u.id, body);
      message.success(ok);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const resetPassword = (u: Row) => {
    let pw = "";
    modal.confirm({
      title: `Đặt lại mật khẩu cho ${u.username}`,
      content: <Input.Password placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" onChange={(e) => (pw = e.target.value)} />,
      okText: "Đặt lại",
      cancelText: "Hủy",
      onOk: async () => {
        if (pw.length < 6) {
          message.error("Mật khẩu tối thiểu 6 ký tự");
          throw new Error("invalid");
        }
        await api.users.resetPassword(u.id, pw);
        message.success("Đã đặt lại mật khẩu");
      },
    });
  };

  const create = async (v: Record<string, unknown>) => {
    try {
      await api.users.create(v);
      message.success("Đã tạo tài khoản quản trị");
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
        title="Tài khoản người dùng"
        subtitle="Khóa / mở khóa, đặt lại mật khẩu, phân quyền. Thủ thư tạo ở mục Nhân viên, bạn đọc tạo ở mục Đọc giả."
        extra={<Button onClick={() => setCreating(true)}>Tạo tài khoản quản trị</Button>}
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Tên đăng nhập, họ tên, email" allowClear style={{ width: 280 }} onSearch={(q) => setFilter({ q })} />
        <Select allowClear placeholder="Vai trò" style={{ width: 160 }} options={options("role")} onChange={(role) => setFilter({ role })} />
      </Space>
      <Table<Row>
        {...tableProps}
        scroll={{ x: 1000 }}
        columns={[
          { title: "Tên đăng nhập", dataIndex: "username" },
          { title: "Họ tên", dataIndex: "fullName" },
          { title: "Mã", render: (_, u) => u.reader?.studentCode ?? u.staff?.staffCode ?? "—" },
          { title: "Email", render: (_, u) => u.email ?? "—" },
          {
            title: "Vai trò",
            render: (_, u) =>
              u.staff && u.id !== me?.id ? (
                <Select
                  size="small"
                  value={u.role}
                  style={{ width: 120 }}
                  options={options("role", ["LIBRARIAN", "ADMIN"])}
                  onChange={(role) => update(u, { role }, "Đã đổi vai trò")}
                />
              ) : (
                <StatusTag kind="role" value={u.role} />
              ),
          },
          { title: "Ngày tạo", render: (_, u) => fmtDate(u.createdAt) },
          {
            title: "Hoạt động",
            render: (_, u) => (
              <Popconfirm
                title={u.isActive ? "Khóa tài khoản này?" : "Mở khóa tài khoản?"}
                okText="Đồng ý"
                cancelText="Không"
                disabled={u.id === me?.id}
                onConfirm={() => update(u, { isActive: !u.isActive }, u.isActive ? "Đã khóa tài khoản" : "Đã mở khóa")}
              >
                <Switch size="small" checked={u.isActive} disabled={u.id === me?.id} />
              </Popconfirm>
            ),
          },
          { title: "", render: (_, u) => <Button size="small" onClick={() => resetPassword(u)}>Đặt lại mật khẩu</Button> },
        ]}
      />
      <Modal open={creating} title="Tạo tài khoản quản trị" okText="Tạo tài khoản" cancelText="Hủy" onCancel={() => setCreating(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, pattern: /^[a-zA-Z0-9_.]{4,}$/, message: "Tối thiểu 4 ký tự, không dấu" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
