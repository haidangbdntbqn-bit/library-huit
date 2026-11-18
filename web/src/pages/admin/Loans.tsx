import { Input, Select, Space, Table } from "antd";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import PageHeader from "../../components/PageHeader";
import SendReminders from "../../components/SendReminders";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import type { Loan } from "../../types";
import { daysLeft, fmtDate, fmtDateTime, money, options } from "../../utils/format";

export default function Loans() {
  const [params] = useSearchParams();
  const { tableProps, setFilter } = usePaged<Loan>(api.loans.list, { status: params.get("status") ?? undefined });

  return (
    <>
      <PageHeader title="Phiếu mượn" subtitle="Tra cứu phiếu mượn về nhà và đọc tại chỗ" extra={<SendReminders />} />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Số phiếu, MSSV, họ tên" allowClear style={{ width: 280 }} onSearch={(q) => setFilter({ q })} />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 180 }}
          defaultValue={params.get("status") ?? undefined}
          options={options("loan")}
          onChange={(status) => setFilter({ status })}
        />
        <Select allowClear placeholder="Hình thức" style={{ width: 180 }} options={options("loanType")} onChange={(loanType) => setFilter({ loanType })} />
      </Space>
      <Table<Loan>
        {...tableProps}
        scroll={{ x: 900 }}
        expandable={{
          expandedRowRender: (l) => (
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={l.items}
              columns={[
                { title: "Mã vạch", render: (_, i) => i.copy.barcode },
                { title: "Tên sách", render: (_, i) => i.copy.book.title },
                { title: "Hạn trả", render: (_, i) => fmtDate(i.dueAt) },
                { title: "Gia hạn", render: (_, i) => `${i.renewCount} lần` },
                { title: "Ngày trả", render: (_, i) => fmtDateTime(i.returnedAt) },
                { title: "Tình trạng", render: (_, i) => <StatusTag kind="condition" value={i.returnCondition} /> },
                { title: "Phạt", render: (_, i) => (Number(i.fine) ? money(i.fine) : "—") },
              ]}
            />
          ),
        }}
        columns={[
          { title: "Số phiếu", dataIndex: "code" },
          { title: "Bạn đọc", render: (_, l) => `${l.reader?.user.fullName} (${l.reader?.studentCode})` },
          { title: "Hình thức", render: (_, l) => <StatusTag kind="loanType" value={l.loanType} /> },
          { title: "Ngày mượn", render: (_, l) => fmtDateTime(l.borrowedAt) },
          {
            title: "Hạn gần nhất",
            render: (_, l) => {
              const open = l.items.filter((i) => !i.returnedAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
              if (!open) return "—";
              const left = daysLeft(open.dueAt);
              return <span style={{ color: left < 0 ? "var(--c-danger)" : undefined }}>{fmtDate(open.dueAt)}</span>;
            },
          },
          { title: "Số cuốn", render: (_, l) => `${l.openItems}/${l.items.length} chưa trả` },
          { title: "Thủ thư", render: (_, l) => l.staff?.user.fullName ?? "—" },
          { title: "Trạng thái", render: (_, l) => <StatusTag kind="loan" value={l.isOverdue ? "OVERDUE" : l.status} /> },
        ]}
      />
    </>
  );
}
