import { Button, Col, Row, Table } from "antd";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad } from "../../hooks/usePaged";
import { fmtDateTime, money } from "../../utils/format";

function Kpi({ value, label, tone, onClick }: { value: number | string; label: string; tone?: string; onClick?: () => void }) {
  return (
    <div className="panel kpi" style={{ cursor: onClick ? "pointer" : undefined, height: "100%" }} onClick={onClick}>
      <span className="value" style={{ color: tone }}>
        {value}
      </span>
      <span className="label">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: o } = useLoad(() => api.reports.overview());
  const { data: usage } = useLoad(() => api.reports.serviceUsage());
  const { data: loans, loading } = useLoad(() => api.loans.list({ pageSize: 6 }));

  return (
    <>
      <PageHeader
        title="Tổng quan"
        subtitle="Tình hình hoạt động của thư viện hôm nay"
        extra={
          <>
            <Button type="primary" onClick={() => navigate("/admin/loans/new")}>
              Lập phiếu mượn
            </Button>
            <Button onClick={() => navigate("/admin/returns")}>Nhận trả sách</Button>
          </>
        }
      />
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <Kpi value={o?.loansToday ?? "…"} label={`Lượt mượn hôm nay (${o?.homeToday ?? 0} về nhà, ${o?.onsiteToday ?? 0} tại chỗ)`} />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={o?.overdueItems ?? "…"} label="Cuốn đang quá hạn" tone="var(--c-danger)" onClick={() => navigate("/admin/loans?status=OVERDUE")} />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={`${o?.roomsInUse ?? "…"}/${o?.groupRooms ?? "…"}`} label="Phòng nhóm đang sử dụng" onClick={() => navigate("/admin/rooms")} />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={o ? money(o.revenueThisMonth) : "…"} label="Doanh thu tài liệu tháng này" />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={o?.lockedCards ?? "…"} label="Thẻ thư viện đang khóa" tone="var(--c-warn)" onClick={() => navigate("/admin/cards")} />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={o?.pendingRequests ?? "…"} label="Yêu cầu mượn chờ soạn" tone="var(--c-warn)" onClick={() => navigate("/admin/borrow-requests")} />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={o?.pendingBookings ?? "…"} label="Lượt đặt phòng chờ duyệt" tone="var(--c-warn)" onClick={() => navigate("/admin/rooms")} />
        </Col>
        <Col xs={12} lg={6}>
          <Kpi value={o ? `${o.titles} / ${o.copies}` : "…"} label="Đầu sách / bản sách trong kho" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={14}>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Mật độ sử dụng dịch vụ 12 tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usage ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="homeLoans" name="Mượn về nhà" stackId="loan" fill="#0B4DA2" />
                <Bar dataKey="onsiteLoans" name="Đọc tại chỗ" stackId="loan" fill="#7FA6DC" />
                <Bar dataKey="bookings" name="Mượn phòng" fill="#B45309" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} xl={10}>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ marginTop: 0 }}>Phiếu mượn gần đây</h3>
              <a onClick={() => navigate("/admin/loans")}>Xem tất cả</a>
            </div>
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              pagination={false}
              dataSource={loans?.items ?? []}
              columns={[
                { title: "Số phiếu", dataIndex: "code" },
                { title: "Bạn đọc", render: (_, l) => l.reader?.user.fullName },
                { title: "Lúc", render: (_, l) => fmtDateTime(l.borrowedAt) },
                { title: "", render: (_, l) => <StatusTag kind="loan" value={l.isOverdue ? "OVERDUE" : l.status} /> },
              ]}
            />
          </div>
        </Col>
      </Row>
    </>
  );
}
