import { DatePicker, Input, Space, Table, Tag } from "antd";
import { api } from "../../api";
import PageHeader from "../../components/PageHeader";
import { usePaged } from "../../hooks/usePaged";
import type { AuditLog } from "../../types";
import { fmtDateTime } from "../../utils/format";

/** Nhật ký thao tác của thủ thư, quản trị viên: ai làm gì, lúc nào, kết quả ra sao */
export default function AuditLogs() {
  const { tableProps, setFilter } = usePaged<AuditLog>(api.auditLogs.list, {}, 20);
  return (
    <>
      <PageHeader title="Nhật ký thao tác" subtitle="Mọi thao tác thay đổi dữ liệu của thủ thư, quản trị viên và các lần đăng nhập đều được ghi lại để truy vết trách nhiệm" />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Thao tác, tài khoản, nội dung" allowClear style={{ width: 300 }} onSearch={(q) => setFilter({ q })} />
        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          onChange={(v) => setFilter({ from: v?.[0]?.format("YYYY-MM-DD"), to: v?.[1]?.format("YYYY-MM-DD") })}
        />
      </Space>
      <Table<AuditLog>
        {...tableProps}
        rowKey="id"
        size="small"
        scroll={{ x: 900 }}
        expandable={{ expandedRowRender: (r) => <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{r.detail ?? "(không có nội dung)"}</pre>, rowExpandable: (r) => !!r.detail }}
        columns={[
          { title: "Thời gian", render: (_, r) => fmtDateTime(r.createdAt), width: 150 },
          { title: "Người thực hiện", render: (_, r) => (r.user ? `${r.user.fullName} (${r.user.username})` : r.username ?? "—") },
          { title: "Vai trò", render: (_, r) => (r.role ? <Tag color={r.role === "ADMIN" ? "purple" : "blue"}>{r.role === "ADMIN" ? "Quản trị" : r.role === "LIBRARIAN" ? "Thủ thư" : r.role}</Tag> : "—") },
          { title: "Thao tác", dataIndex: "action" },
          { title: "Kết quả", render: (_, r) => <Tag color={r.status < 400 ? "green" : "red"}>{r.status < 400 ? "Thành công" : `Lỗi ${r.status}`}</Tag> },
          { title: "API", render: (_, r) => <code style={{ fontSize: 12 }}>{`${r.method} ${r.path}`}</code> },
          { title: "IP", dataIndex: "ip" },
        ]}
      />
    </>
  );
}
