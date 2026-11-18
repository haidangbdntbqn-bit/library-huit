import { Tag } from "antd";
import { LABELS } from "../utils/format";

/** Hiển thị trạng thái bằng tag màu. kind: xem bảng LABELS trong utils/format.ts */
export default function StatusTag({ kind, value }: { kind: string; value?: string | null }) {
  if (!value) return <span className="muted">—</span>;
  const l = LABELS[kind]?.[value];
  return <Tag color={l?.color}>{l?.text ?? value}</Tag>;
}
