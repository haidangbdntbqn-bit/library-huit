export const money = (v: number | string) => `${Number(v).toLocaleString("vi-VN")} đ`;

const pad = (n: number) => String(n).padStart(2, "0");
export const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const fmtTime = (v: string) => {
  const d = new Date(v);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const daysLeft = (due: string) => {
  const a = new Date(due);
  a.setHours(0, 0, 0, 0);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
};

type Tone = "default" | "good" | "warn" | "bad" | "info";
export const STATUS: Record<string, Record<string, [string, Tone]>> = {
  card: { PENDING: ["Chờ duyệt", "warn"], ACTIVE: ["Còn hiệu lực", "good"], LOCKED: ["Đã khóa", "bad"], EXPIRED: ["Hết hạn", "default"], REJECTED: ["Bị từ chối", "bad"] },
  request: { PENDING: ["Chờ soạn sách", "warn"], READY: ["Sẵn sàng nhận", "good"], FULFILLED: ["Đã nhận", "default"], REJECTED: ["Bị từ chối", "bad"], CANCELLED: ["Đã hủy", "default"] },
  booking: { PENDING: ["Chờ duyệt", "warn"], APPROVED: ["Đã duyệt", "good"], REJECTED: ["Bị từ chối", "bad"], IN_USE: ["Đang sử dụng", "info"], COMPLETED: ["Đã trả phòng", "default"], CANCELLED: ["Đã hủy", "default"] },
  roomState: { AVAILABLE: ["Trống", "good"], IN_USE: ["Đang sử dụng", "info"], RESERVED: ["Đã có lịch", "warn"], MAINTENANCE: ["Bảo trì", "default"] },
  category: { BAI_GIANG: ["Bài giảng", "info"], GIAO_TRINH: ["Giáo trình", "good"], SACH_THAM_KHAO: ["Sách tham khảo", "default"] },
  loanType: { HOME: ["Mượn về nhà", "info"], ONSITE: ["Đọc tại chỗ", "default"] },
  order: { PENDING: ["Chờ thanh toán", "warn"], PAID: ["Đã thanh toán", "info"], COMPLETED: ["Đã nhận", "good"], CANCELLED: ["Đã hủy", "default"] },
  violation: { UNPAID: ["Chưa nộp", "bad"], PAID: ["Đã nộp", "good"], WAIVED: ["Miễn phạt", "default"] },
  loan: { BORROWING: ["Đang mượn", "info"], RETURNED: ["Đã trả", "default"] },
};
export const status = (kind: string, v?: string | null): [string, Tone] => (v && STATUS[kind]?.[v]) || [v ?? "—", "default"];
