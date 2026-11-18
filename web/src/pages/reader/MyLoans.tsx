import { App, Button, Empty, Popconfirm, Table, Tabs, Tag } from "antd";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { DueBanner } from "../../components/Notifications";
import StatusTag from "../../components/StatusTag";
import { useLoad } from "../../hooks/usePaged";
import type { Loan, LoanItem } from "../../types";
import { daysLeft, fmtDate, fmtDateTime, money } from "../../utils/format";

type OpenItem = LoanItem & { loan: Loan };

export default function MyLoans() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const loans = useLoad(() => api.loans.mine());
  const requests = useLoad(() => api.borrowRequests.mine());
  const settings = useLoad(() => api.settings.get());
  const maxRenew = settings.data?.values.MAX_RENEWALS ?? 1;
  const renewDays = settings.data?.values.RENEW_DAYS ?? 3;

  const open: OpenItem[] = (loans.data ?? [])
    .flatMap((l) => l.items.filter((i) => !i.returnedAt).map((i) => ({ ...i, loan: l })))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const renew = async (item: OpenItem) => {
    try {
      const updated = await api.loans.renew(item.id);
      message.success(`Đã gia hạn đến ${fmtDate(updated.dueAt)}`);
      loans.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const cancelRequest = async (id: number) => {
    try {
      await api.borrowRequests.cancel(id);
      message.success("Đã hủy yêu cầu");
      requests.reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <PageHeader title="Sách của tôi" subtitle={`Theo dõi hạn trả, gia hạn (mỗi lần thêm ${renewDays} ngày) và lịch sử mượn sách`} />
      <DueBanner />
      <Tabs
        activeKey={params.get("tab") ?? "open"}
        onChange={(tab) => setParams({ tab })}
        items={[
          {
            key: "open",
            label: `Đang mượn (${open.length})`,
            children: (
              <Table<OpenItem>
                rowKey="id"
                loading={loans.loading}
                dataSource={open}
                pagination={false}
                scroll={{ x: 720 }}
                locale={{ emptyText: <Empty description="Bạn không có sách nào đang mượn" /> }}
                columns={[
                  { title: "Tên sách", render: (_, i) => <strong>{i.copy.book.title}</strong> },
                  { title: "Mã vạch", render: (_, i) => i.copy.barcode },
                  { title: "Hình thức", render: (_, i) => <StatusTag kind="loanType" value={i.loan.loanType} /> },
                  { title: "Ngày mượn", render: (_, i) => fmtDate(i.loan.borrowedAt) },
                  {
                    title: "Hạn trả",
                    render: (_, i) => {
                      const left = daysLeft(i.dueAt);
                      return (
                        <span>
                          {fmtDate(i.dueAt)}{" "}
                          {left < 0 ? <Tag color="red">Quá {-left} ngày</Tag> : left <= 2 ? <Tag color="gold">Còn {left} ngày</Tag> : null}
                        </span>
                      );
                    },
                  },
                  {
                    title: "",
                    align: "right",
                    render: (_, i) =>
                      i.loan.loanType === "HOME" && (
                        <Popconfirm title={`Gia hạn thêm ${renewDays} ngày cho cuốn sách này?`} okText="Gia hạn" cancelText="Không" onConfirm={() => renew(i)}>
                          <Button disabled={i.renewCount >= maxRenew || daysLeft(i.dueAt) < 0}>
                            {i.renewCount >= maxRenew ? "Đã gia hạn" : "Gia hạn"}
                          </Button>
                        </Popconfirm>
                      ),
                  },
                ]}
              />
            ),
          },
          {
            key: "requests",
            label: "Yêu cầu mượn trực tuyến",
            children: (
              <Table
                rowKey="id"
                loading={requests.loading}
                dataSource={requests.data ?? []}
                pagination={false}
                scroll={{ x: 640 }}
                locale={{ emptyText: <Empty description="Chưa có yêu cầu. Tìm sách và bấm Đặt mượn để gửi yêu cầu." /> }}
                columns={[
                  { title: "Tên sách", render: (_, r) => <strong>{r.book.title}</strong> },
                  { title: "Hình thức", render: (_, r) => <StatusTag kind="loanType" value={r.loanType} /> },
                  { title: "Ngày gửi", render: (_, r) => fmtDateTime(r.createdAt) },
                  { title: "Trạng thái", render: (_, r) => <StatusTag kind="request" value={r.status} /> },
                  {
                    title: "Ghi chú",
                    render: (_, r) =>
                      r.status === "READY"
                        ? `Đã soạn sẵn bản ${r.copy?.barcode ?? ""}, nhận tại quầy trước ${fmtDate(r.pickupBefore)}`
                        : r.status === "PENDING"
                          ? "Thư viện đang soạn sách"
                          : r.note ?? "",
                  },
                  {
                    title: "",
                    align: "right",
                    render: (_, r) =>
                      ["PENDING", "READY"].includes(r.status) && (
                        <Popconfirm title="Hủy yêu cầu mượn?" okText="Hủy yêu cầu" cancelText="Không" onConfirm={() => cancelRequest(r.id)}>
                          <Button danger>Hủy</Button>
                        </Popconfirm>
                      ),
                  },
                ]}
              />
            ),
          },
          {
            key: "history",
            label: "Lịch sử mượn",
            children: (
              <Table<Loan>
                rowKey="id"
                loading={loans.loading}
                dataSource={loans.data ?? []}
                scroll={{ x: 640 }}
                expandable={{
                  expandedRowRender: (l) => (
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={l.items}
                      columns={[
                        { title: "Sách", render: (_, i) => i.copy.book.title },
                        { title: "Hạn trả", render: (_, i) => fmtDate(i.dueAt) },
                        { title: "Ngày trả", render: (_, i) => fmtDate(i.returnedAt) },
                        { title: "Tình trạng trả", render: (_, i) => <StatusTag kind="condition" value={i.returnCondition} /> },
                        { title: "Tiền phạt", render: (_, i) => (Number(i.fine) ? money(i.fine) : "—") },
                      ]}
                    />
                  ),
                }}
                columns={[
                  { title: "Số phiếu", dataIndex: "code" },
                  { title: "Ngày mượn", render: (_, l) => fmtDate(l.borrowedAt) },
                  { title: "Hình thức", render: (_, l) => <StatusTag kind="loanType" value={l.loanType} /> },
                  { title: "Số cuốn", render: (_, l) => l.items.length },
                  { title: "Trạng thái", render: (_, l) => <StatusTag kind="loan" value={l.isOverdue ? "OVERDUE" : l.status} /> },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
