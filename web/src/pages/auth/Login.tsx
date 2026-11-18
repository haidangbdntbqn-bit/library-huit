import { BookOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errMsg } from "../../api/client";
import { useAuth } from "../../store/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string } | null)?.from;

  const onFinish = async (v: { username: string; password: string }) => {
    setLoading(true);
    setError(undefined);
    try {
      const me = await login(v.username, v.password);
      navigate(from ?? (me.role === "READER" ? "/" : "/admin"), { replace: true });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="panel" style={{ width: "100%", maxWidth: 400, padding: 32 }}>
        <Link to="/" className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark">
            <BookOutlined />
          </span>
          Thư viện HUIT
        </Link>
        <h1 className="page-title">Đăng nhập</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Dùng tài khoản thư viện của bạn.
        </p>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: "Nhập tên đăng nhập" }]}>
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: "Nhập mật khẩu" }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Đăng nhập
          </Button>
        </Form>
        <p style={{ marginTop: 20, marginBottom: 0 }} className="muted">
          Chưa có tài khoản? <Link to="/register">Đăng ký bạn đọc</Link>
        </p>
      </div>
    </div>
  );
}
