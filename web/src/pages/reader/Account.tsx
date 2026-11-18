import { App, Alert, Button, Col, Descriptions, Form, Input, Row, Table, Tabs } from "antd";
import { useLocation } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import Barcode128 from "../../components/Barcode128";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad } from "../../hooks/usePaged";
import { useAuth } from "../../store/auth";
import type { LibraryCard } from "../../types";
import { fmtDate, label, money } from "../../utils/format";

/** Mã vạch thẻ thư viện (Code 128, quét được bằng máy quét tại quầy) */
function Barcode({ value }: { value: string }) {
  return (
    <div style={{ background: "#fff", padding: "6px 8px", borderRadius: 6, display: "inline-block" }}>
      <Barcode128 value={value} height={40} module={1.4} />
    </div>
  );
}

function CardSection() {
  const { user } = useAuth();
  const card = useLoad<LibraryCard | null>(() => api.cards.mine());
  const c = card.data;
  if (card.loading) return null;

  return (
    <Row gutter={[32, 24]}>
      <Col xs={24} md={12}>
        {c ? (
          <div className="library-card" style={c.status !== "ACTIVE" ? { background: "#4B5874" } : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Thẻ sinh viên – Thẻ thư viện HUIT</span>
              <span>{label("card", c.status)}</span>
            </div>
            <div>
              <div className="number">{c.cardNumber}</div>
              <div>{user?.fullName}</div>
              <div style={{ opacity: 0.8, fontSize: 13 }}>Hết hạn {fmtDate(c.expiresAt)}</div>
            </div>
            <Barcode value={c.cardNumber ?? ""} />
          </div>
        ) : (
          <Alert type="warning" showIcon message="Tài khoản chưa có thẻ thư viện, vui lòng liên hệ quầy thư viện." />
        )}
        {c?.status === "LOCKED" && (
          <Alert style={{ marginTop: 12 }} type="error" showIcon message={`Thẻ đang bị khóa${c.note ? `: ${c.note}` : ""}. Liên hệ quầy thư viện để được hỗ trợ.`} />
        )}
        {c?.status === "EXPIRED" && (
          <Alert style={{ marginTop: 12 }} type="warning" showIcon message="Thẻ đã hết thời hạn sử dụng (6 năm kể từ năm nhập học)." />
        )}
      </Col>
      <Col xs={24} md={12}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Số thẻ">{c?.cardNumber ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <StatusTag kind="card" value={c?.status ?? null} />
          </Descriptions.Item>
          <Descriptions.Item label="Ngày kích hoạt">{fmtDate(c?.issuedAt)}</Descriptions.Item>
          <Descriptions.Item label="Hạn sử dụng">{fmtDate(c?.expiresAt)}</Descriptions.Item>
          <Descriptions.Item label="Hạn mức mượn">{user?.reader?.maxBooks ?? "—"} cuốn</Descriptions.Item>
        </Descriptions>
        <p className="muted" style={{ marginTop: 12 }}>
          Thẻ sinh viên được dùng làm thẻ thư viện, tự kích hoạt khi bạn đăng ký tài khoản bằng MSSV, không cần chờ duyệt.
        </p>
      </Col>
    </Row>
  );
}

export default function Account() {
  const { user, refresh } = useAuth();
  const { message } = App.useApp();
  const location = useLocation();
  const isReader = user?.role === "READER";
  const violations = useLoad(() => (isReader ? api.violations.mine() : Promise.resolve([])), [isReader]);
  const [pwForm] = Form.useForm();

  const saveProfile = async (v: Record<string, unknown>) => {
    try {
      await api.auth.updateMe(v);
      await refresh();
      message.success("Đã lưu thông tin");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const changePassword = async (v: Record<string, unknown>) => {
    try {
      await api.auth.changePassword(v);
      pwForm.resetFields();
      message.success("Đã đổi mật khẩu");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const justRegistered = (location.state as { justRegistered?: boolean } | null)?.justRegistered;

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <PageHeader title="Tài khoản" subtitle={user?.reader ? `MSSV ${user.reader.studentCode} · ${user.reader.major?.name ?? ""}` : label("role", user?.role)} />
      {justRegistered && (
        <Alert type="success" showIcon style={{ marginBottom: 16 }} message="Đăng ký thành công. Thẻ thư viện (thẻ sinh viên) của bạn đã được kích hoạt, bạn có thể mượn sách và mượn phòng ngay." />
      )}
      <Tabs
        items={[
          ...(isReader ? [{ key: "card", label: "Thẻ thư viện", children: <CardSection /> }] : []),
          {
            key: "profile",
            label: "Thông tin cá nhân",
            children: (
              <div className="panel" style={{ maxWidth: 560 }}>
                <Form layout="vertical" initialValues={{ fullName: user?.fullName, email: user?.email, phone: user?.phone }} onFinish={saveProfile}>
                  <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="phone" label="Số điện thoại">
                    <Input />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    Lưu thông tin
                  </Button>
                </Form>
              </div>
            ),
          },
          ...(isReader
            ? [
                {
                  key: "violations",
                  label: "Vi phạm",
                  children: (
                    <Table
                      rowKey="id"
                      loading={violations.loading}
                      dataSource={violations.data ?? []}
                      locale={{ emptyText: "Bạn không có vi phạm nào" }}
                      columns={[
                        { title: "Ngày", render: (_, v) => fmtDate(v.createdAt) },
                        { title: "Loại", render: (_, v) => <StatusTag kind="violationType" value={v.type} /> },
                        { title: "Nội dung", dataIndex: "description" },
                        { title: "Tiền phạt", render: (_, v) => money(v.fineAmount) },
                        { title: "Trạng thái", render: (_, v) => <StatusTag kind="violation" value={v.status} /> },
                      ]}
                    />
                  ),
                },
              ]
            : []),
          {
            key: "password",
            label: "Đổi mật khẩu",
            children: (
              <div className="panel" style={{ maxWidth: 420 }}>
                <Form form={pwForm} layout="vertical" onFinish={changePassword}>
                  <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}>
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6, message: "Tối thiểu 6 ký tự" }]}>
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    Đổi mật khẩu
                  </Button>
                </Form>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
