import { BookOutlined, DownOutlined, LogoutOutlined, MenuOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Grid } from "antd";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import ChatbotWidget from "../components/ChatbotWidget";
import { NotificationBell } from "../components/Notifications";
import { useAuth } from "../store/auth";

const NAV = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/search", label: "Tra cứu sách" },
  { to: "/rooms", label: "Mượn phòng" },
  { to: "/store", label: "Nhà sách" },
  { to: "/my-loans", label: "Sách của tôi" },
];

export default function ReaderLayout() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [drawer, setDrawer] = useState(false);

  const initials = user?.fullName
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="reader-header">
        <div className="container inner">
          {!screens.md && <Button type="text" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setDrawer(true)} />}
          <Link to="/" className="brand">
            <span className="brand-mark">
              <BookOutlined />
            </span>
            Thư viện HUIT
          </Link>
          <nav className="reader-nav" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            {user?.role === "READER" && <NotificationBell />}
            {user ? (
              <Dropdown
                menu={{
                  items: [
                    { key: "account", icon: <UserOutlined />, label: "Tài khoản & thẻ mượn", onClick: () => navigate("/account") },
                    ...(isStaff ? [{ key: "admin", icon: <SettingOutlined />, label: "Trang quản trị", onClick: () => navigate("/admin") }] : []),
                    { type: "divider" as const },
                    { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", onClick: () => { logout(); navigate("/"); } },
                  ],
                }}
              >
                <Button type="text" style={{ height: 44 }}>
                  <Avatar style={{ background: "var(--c-primary-soft)", color: "var(--c-primary-dark)" }}>{initials}</Avatar>
                  {screens.sm && <span style={{ marginLeft: 8 }}>{user.fullName}</span>}
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            ) : (
              <Button type="primary" onClick={() => navigate("/login")}>
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      <Drawer open={drawer} onClose={() => setDrawer(false)} placement="left" width={260} title="Thư viện HUIT">
        <nav className="reader-nav" style={{ display: "flex", flexDirection: "column" }} onClick={() => setDrawer(false)}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </Drawer>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer style={{ borderTop: "1px solid var(--c-line)", marginTop: 48, padding: "20px 0", background: "var(--c-surface)" }}>
        <div className="container muted" style={{ fontSize: 13 }}>
          Thư viện Trường Đại học Công Thương TP.HCM
        </div>
      </footer>

      <ChatbotWidget />
    </div>
  );
}
