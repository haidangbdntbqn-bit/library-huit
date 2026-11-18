import dayjs from "dayjs";

export const money = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(v ?? 0));

export const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");
export const fmtDateTime = (v?: string | Date | null) => (v ? dayjs(v).format("HH:mm DD/MM/YYYY") : "—");
export const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format("HH:mm") : "—");

/** Số ngày còn lại tới hạn (âm = quá hạn) */
export const daysLeft = (due: string) => dayjs(due).startOf("day").diff(dayjs().startOf("day"), "day");

type Label = { text: string; color: string };

/** Nhãn và màu cho mọi trạng thái trong hệ thống */
export const LABELS: Record<string, Record<string, Label>> = {
  role: {
    READER: { text: "Bạn đọc", color: "default" },
    LIBRARIAN: { text: "Thủ thư", color: "blue" },
    ADMIN: { text: "Quản trị", color: "purple" },
  },
  readerType: {
    STUDENT: { text: "Sinh viên", color: "default" },
    LECTURER: { text: "Giảng viên", color: "geekblue" },
    STAFF: { text: "Cán bộ", color: "cyan" },
  },
  readerStatus: {
    ACTIVE: { text: "Hoạt động", color: "green" },
    SUSPENDED: { text: "Tạm ngưng", color: "red" },
  },
  card: {
    ACTIVE: { text: "Còn hiệu lực", color: "green" },
    LOCKED: { text: "Đã khóa", color: "red" },
    EXPIRED: { text: "Hết hạn", color: "default" },
  },
  docType: {
    GIAO_TRINH: { text: "Giáo trình", color: "cyan" },
    TLTK: { text: "Tài liệu tham khảo", color: "purple" },
  },
  copy: {
    AVAILABLE: { text: "Sẵn sàng", color: "green" },
    BORROWED: { text: "Đang mượn", color: "blue" },
    RESERVED: { text: "Đang giữ cho bạn đọc", color: "purple" },
    DAMAGED: { text: "Hư hỏng", color: "orange" },
    LOST: { text: "Mất", color: "red" },
    LIQUIDATED: { text: "Đã thanh lý", color: "default" },
  },
  loanType: {
    HOME: { text: "Mượn về nhà", color: "blue" },
    ONSITE: { text: "Đọc tại chỗ", color: "cyan" },
  },
  loan: {
    BORROWING: { text: "Đang mượn", color: "blue" },
    RETURNED: { text: "Đã trả", color: "default" },
    OVERDUE: { text: "Quá hạn", color: "red" },
  },
  condition: {
    GOOD: { text: "Bình thường", color: "green" },
    DAMAGED: { text: "Hư hỏng", color: "orange" },
    LOST: { text: "Mất", color: "red" },
  },
  request: {
    PENDING: { text: "Chờ soạn sách", color: "gold" },
    READY: { text: "Sẵn sàng nhận", color: "green" },
    FULFILLED: { text: "Đã nhận sách", color: "default" },
    REJECTED: { text: "Bị từ chối", color: "red" },
    CANCELLED: { text: "Đã hủy", color: "default" },
  },
  violationType: {
    LATE: { text: "Trả trễ", color: "orange" },
    DAMAGED: { text: "Làm hỏng", color: "volcano" },
    LOST: { text: "Làm mất", color: "red" },
    OTHER: { text: "Khác", color: "default" },
  },
  violation: {
    UNPAID: { text: "Chưa nộp", color: "red" },
    PAID: { text: "Đã nộp", color: "green" },
    WAIVED: { text: "Miễn phạt", color: "default" },
  },
  roomType: {
    READING: { text: "Phòng đọc", color: "geekblue" },
    GROUP: { text: "Phòng học nhóm", color: "cyan" },
  },
  roomState: {
    AVAILABLE: { text: "Trống", color: "green" },
    IN_USE: { text: "Đang sử dụng", color: "blue" },
    RESERVED: { text: "Đã có lịch", color: "gold" },
    MAINTENANCE: { text: "Bảo trì", color: "default" },
  },
  booking: {
    PENDING: { text: "Chờ duyệt", color: "gold" },
    APPROVED: { text: "Đã duyệt", color: "green" },
    REJECTED: { text: "Bị từ chối", color: "red" },
    IN_USE: { text: "Đang sử dụng", color: "blue" },
    COMPLETED: { text: "Đã trả phòng", color: "default" },
    CANCELLED: { text: "Đã hủy", color: "default" },
  },
  order: {
    PENDING: { text: "Chờ thanh toán", color: "gold" },
    PAID: { text: "Đã thanh toán", color: "blue" },
    COMPLETED: { text: "Đã nhận tài liệu", color: "green" },
    CANCELLED: { text: "Đã hủy", color: "default" },
  },
  payment: {
    CASH: { text: "Tiền mặt tại quầy", color: "default" },
    TRANSFER: { text: "Chuyển khoản", color: "default" },
  },
  category: {
    BAI_GIANG: { text: "Tài liệu bài giảng", color: "blue" },
    GIAO_TRINH: { text: "Giáo trình", color: "cyan" },
    SACH_THAM_KHAO: { text: "Sách tham khảo", color: "purple" },
  },
  format: {
    PRINT: { text: "Bản in", color: "default" },
    DIGITAL: { text: "Bản số (PDF)", color: "purple" },
  },
};

export const label = (kind: string, value?: string | null) => (value ? LABELS[kind]?.[value]?.text ?? value : "—");

/** Tạo options cho Select từ bảng nhãn */
export const options = (kind: string, only?: string[]) =>
  Object.entries(LABELS[kind])
    .filter(([k]) => !only || only.includes(k))
    .map(([value, l]) => ({ value, label: l.text }));
