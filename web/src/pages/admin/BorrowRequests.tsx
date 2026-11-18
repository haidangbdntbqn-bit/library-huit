import { App, Button, Popconfirm, Space, Table, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import type { BorrowRequest } from "../../types";
import { fmtDate, fmtDateTime } from "../../utils/format";

export default function BorrowRequests() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { tableProps, setFilter, reload, params } = usePaged<BorrowRequest>(api.borrowRequests.list, { status: "PENDING" });

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader title="Yêu cầu mượn trực tuyến" subtitle="Bấm Đã soạn sách để giữ một bản cho bạn đọc; khi bạn đọc đến quầy, bấm Lập phiếu mượn – phiếu tự điền bạn đọc, mã vạch, hình thức và hạn trả" />
      <Tabs
        activeKey={String(params.status ?? "")}
        onChange={(status) => setFilter({ status })}
        items={[
          { key: "PENDING", label: "Chờ soạn sách" },
          { key: "READY", label: "Chờ bạn đọc nhận" },
          { key: "FULFILLED", label: "Đã nhận" },
          { key: "", label: "Tất cả" },
        ]}
      />
      <Table<BorrowRequest>
        {...tableProps}
        scroll={{ x: 900 }}
        columns={[
          { title: "Ngày gửi", render: (_, r) => fmtDateTime(r.createdAt) },
          { title: "Bạn đọc", render: (_, r) => `${r.reader?.user.fullName} (${r.reader?.studentCode})` },
          { title: "Sách", render: (_, r) => r.book.title },
          { title: "Kệ", render: (_, r) => r.book.shelf ?? "—" },
          { title: "Hình thức", render: (_, r) => <StatusTag kind="loanType" value={r.loanType} /> },
          { title: "Bản đã giữ", render: (_, r) => r.copy?.barcode ?? "—" },
          { title: "Trạng thái", render: (_, r) => <StatusTag kind="request" value={r.status} /> },
          { title: "Hạn nhận", render: (_, r) => (r.pickupBefore ? fmtDate(r.pickupBefore) : "—") },
          {
            title: "",
            render: (_, r) => (
              <Space>
                {r.status === "PENDING" && (
                  <Button size="small" type="primary" onClick={() => act(() => api.borrowRequests.ready(r.id), "Đã soạn sách: hệ thống giữ một bản cho bạn đọc và báo sách sẵn sàng")}>
                    Đã soạn sách
                  </Button>
                )}
                {r.status === "READY" && (
                  <Button size="small" type="primary" onClick={() => navigate(`/admin/loans/new?code=${r.reader?.studentCode}&pickup=1`)}>
                    Lập phiếu mượn
                  </Button>
                )}
                {["PENDING", "READY"].includes(r.status) && (
                  <Popconfirm title="Từ chối yêu cầu này?" okText="Từ chối" cancelText="Không" onConfirm={() => act(() => api.borrowRequests.reject(r.id), "Đã từ chối")}>
                    <Button size="small" danger>
                      Từ chối
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
