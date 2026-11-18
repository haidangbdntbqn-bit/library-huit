import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  HomeOutlined,
  IdcardOutlined,
  LogoutOutlined,
  ShopOutlined,
  SwapOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, type MenuProps } from "antd";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { label } from "../utils/format";

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const items: MenuProps["items"] = [
    { key: "/admin", icon: <AppstoreOutlined />, label: "Tổng quan" },
    {
      key: "circulation",
      icon: <SwapOutlined />,
      label: "Mượn - trả sách",
      children: [
        { key: "/admin/loans/new", label: "Lập phiếu mượn" },
        { key: "/admin/returns", label: "Trả sách" },
        { key: "/admin/loans", label: "Phiếu mượn" },
        { key: "/admin/borrow-requests", label: "Yêu cầu mượn trực tuyến" },
      ],
    },
    {
      key: "readers",
      icon: <IdcardOutlined />,
      label: "Đọc giả",
      children: [
        { key: "/admin/readers", label: "Danh sách đọc giả" },
        { key: "/admin/cards", label: "Thẻ thư viện" },
        { key: "/admin/violations", label: "Vi phạm" },
      ],
    },
    {
      key: "books",
      icon: <BookOutlined />,
      label: "Kho sách",
      children: [
        { key: "/admin/books", label: "Sách, giáo trình, TLTK" },
        { key: "/admin/imports", label: "Nhập sách" },
        { key: "/admin/liquidations", label: "Thanh lý" },
      ],
    },
    { key: "/admin/rooms", icon: <HomeOutlined />, label: "Phòng đọc, phòng nhóm" },
    { key: "/admin/store", icon: <ShopOutlined />, label: "Nhà sách (bán sách, tài liệu)" },
    { key: "/admin/reports", icon: <BarChartOutlined />, label: "Báo cáo thống kê" },
    ...(hasRole("ADMIN")
      ? [
          {
            key: "system",
            icon: <ToolOutlined />,
            label: "Hệ thống",
            children: [
              { key: "/admin/staff", icon: <TeamOutlined />, label: "Nhân viên thư viện" },
              { key: "/admin/users", icon: <AuditOutlined />, label: "Tài khoản người dùng" },
              { key: "/admin/settings", label: "Cài đặt & danh mục" },
              { key: "/admin/audit-logs", label: "Nhật ký thao tác" },
            ],
          },
        ]
      : []),
  ];

  // Chọn mục menu dài nhất khớp với đường dẫn hiện tại
  const keys = ["/admin/loans/new", "/admin/loans", "/admin/returns", "/admin/borrow-requests", "/admin/readers", "/admin/cards", "/admin/violations", "/admin/books", "/admin/imports", "/admin/liquidations", "/admin/rooms", "/admin/store", "/admin/reports", "/admin/staff", "/admin/users", "/admin/settings"];
  const selected = keys.find((k) => pathname.startsWith(k)) ?? "/admin";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={248} collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg" theme="light" style={{ borderRight: "1px solid var(--c-line)" }}>
        <div className="admin-logo">
          <BookOutlined /> {!collapsed && "Quản trị thư viện"}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selected]}
          defaultOpenKeys={["circulation", "readers", "books"]}
          items={items}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, padding: "0 24px", color: "#fff" }}>
          <Link to="/" style={{ color: "#fff" }}>Trang bạn đọc</Link>
          <span style={{ color: "#D6E2F5" }}>
            {user?.fullName} · {label("role", user?.role)}
          </span>
          <Button icon={<LogoutOutlined />} onClick={() => { logout(); navigate("/login"); }}>
            Đăng xuất
          </Button>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
