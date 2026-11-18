import { BellOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Empty, Popover } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../store/auth";
import type { Notice } from "../types";

const COLOR: Record<Notice["level"], string> = {
  danger: "var(--c-danger)",
  warning: "var(--c-warn)",
  success: "var(--c-booked)",
  info: "var(--c-primary)",
};

/** Lấy nhắc nhở của bạn đọc, tự làm mới mỗi phút */
export function useNotices() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const load = useCallback(() => {
    if (user?.role !== "READER") return setItems([]);
    api.notifications.mine().then(setItems).catch(() => undefined);
  }, [user?.id, user?.role]);
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);
  return { items, reload: load };
}

/** Chuông thông báo trên thanh điều hướng */
export function NotificationBell() {
  const { items } = useNotices();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const urgent = items.filter((n) => n.level === "danger" || n.level === "warning").length;
  const content = (
    <div style={{ width: 340, maxHeight: 420, overflowY: "auto" }}>
      {items.length ? (
        items.map((n) => (
          <button
            key={n.key}
            onClick={() => {
              setOpen(false);
              navigate(n.link);
            }}
            style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, borderBottom: "1px solid var(--c-line)", padding: "10px 4px", cursor: "pointer" }}
          >
            <div style={{ fontWeight: 600, color: COLOR[n.level] }}>{n.title}</div>
            <div style={{ fontSize: 13, color: "var(--c-text)" }}>{n.message}</div>
          </button>
        ))
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có nhắc nhở nào" />
      )}
    </div>
  );
  return (
    <Popover content={content} title="Nhắc nhở" trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={items.length} color={urgent ? "#8C1D2F" : "#0B4DA2"} size="small" offset={[-4, 4]}>
        <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18 }} />} aria-label={`Nhắc nhở (${items.length})`} />
      </Badge>
    </Popover>
  );
}

/** Dải cảnh báo sách quá hạn / sắp đến hạn, hiển thị ở Trang chủ và Sách của tôi */
export function DueBanner() {
  const { items } = useNotices();
  const navigate = useNavigate();
  const due = items.filter((n) => n.key.startsWith("late-") || n.key.startsWith("due-") || n.key === "fine" || n.key.startsWith("ready-"));
  if (!due.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
      {due.map((n) => (
        <Alert
          key={n.key}
          type={n.level === "danger" ? "error" : n.level === "warning" ? "warning" : n.level === "success" ? "success" : "info"}
          showIcon
          message={<strong>{n.title}</strong>}
          description={n.message}
          action={
            <Button size="small" onClick={() => navigate(n.link)}>
              Xem
            </Button>
          }
        />
      ))}
    </div>
  );
}
