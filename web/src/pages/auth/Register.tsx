import { BookOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Form, Input, Row, Select } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errMsg } from "../../api/client";
import MajorSelect from "../../components/MajorSelect";
import { useAuth } from "../../store/auth";
import { options } from "../../utils/format";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const onFinish = async (v: Record<string, unknown>) => {
    setLoading(true);
    setError(undefined);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirm, ...body } = v;
      await register(body);
      navigate("/account", { replace: true, state: { justRegistered: true } });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="panel" style={{ width: "100%", maxWidth: 640, padding: 32 }}>
        <Link to="/" className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark">
            <BookOutlined />
          </span>
          Thư viện HUIT
        </Link>
        <h1 className="page-title">Đăng ký bạn đọc</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Đăng ký bằng MSSV: thẻ sinh viên được kích hoạt làm thẻ thư viện ngay, không cần chờ duyệt.
        </p>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} initialValues={{ readerType: "STUDENT" }} requiredMark={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: "Nhập họ tên" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="studentCode" label="MSSV / mã cán bộ" rules={[{ required: true, message: "Nhập MSSV" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="readerType" label="Đối tượng">
                <Select options={options("readerType")} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="majorId" label="Ngành">
                <MajorSelect />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="className" label="Lớp">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email không hợp lệ" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[
                  { required: true, message: "Nhập tên đăng nhập" },
                  { pattern: /^[a-zA-Z0-9_.]{4,}$/, message: "Tối thiểu 4 ký tự, không dấu" },
                ]}
              >
                <Input autoComplete="username" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6, message: "Tối thiểu 6 ký tự" }]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="confirm"
                label="Nhập lại mật khẩu"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Nhập lại mật khẩu" },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      !value || getFieldValue("password") === value ? Promise.resolve() : Promise.reject(new Error("Mật khẩu không khớp")),
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Tạo tài khoản
          </Button>
        </Form>
        <p style={{ marginTop: 20, marginBottom: 0 }} className="muted">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
