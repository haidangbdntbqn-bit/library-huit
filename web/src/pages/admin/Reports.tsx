import { FileExcelOutlined, PrinterOutlined } from "@ant-design/icons";
import { Button, Col, DatePicker, Row, Select, Table } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api";
import PageHeader from "../../components/PageHeader";
import { useLoad } from "../../hooks/usePaged";
import { exportExcel } from "../../utils/excel";
import { money } from "../../utils/format";

const C1 = "#0B4DA2";
const C2 = "#7FA6DC";
const C3 = "#B45309";

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div className="panel" style={{ height: "100%", breakInside: "avoid" }}>
      <h3 style={{ marginTop: 0, marginBottom: note ? 2 : 12 }}>{title}</h3>
      {note && <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>{note}</div>}
      {children}
    </div>
  );
}

export default function Reports() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(11, "month").startOf("month"), dayjs()]);
  const [year, setYear] = useState(dayjs().year());
  const rq = { from: range[0].format("YYYY-MM-DD"), to: range[1].format("YYYY-MM-DD") };

  const usage = useLoad(() => api.reports.serviceUsage(rq), [rq.from, rq.to]);
  const top = useLoad(() => api.reports.topBooks({ ...rq, limit: 10 }), [rq.from, rq.to]);
  const byMajor = useLoad(() => api.reports.booksByMajor());
  const annual = useLoad(() => api.reports.annualUpdates());
  const revenue = useLoad(() => api.reports.revenue(year), [year]);
  const faculty = useLoad(() => api.reports.byFaculty(rq), [rq.from, rq.to]);
  const facultyRows = faculty.data ?? [];
  const [exporting, setExporting] = useState(false);

  /** Xuất toàn bộ số liệu đang xem ra file Excel, mỗi bảng một trang tính */
  const toExcel = async () => {
    setExporting(true);
    try {
      await exportExcel(
        `Bao_cao_thu_vien_${rq.from}_${rq.to}.xlsx`,
        [
          {
            name: "Mật độ dịch vụ",
            rows: (usage.data ?? []).map((r) => ({ "Tháng": r.month, "Mượn về nhà": r.homeLoans, "Đọc tại chỗ": r.onsiteLoans, "Lượt mượn phòng": r.bookings, "Đơn mua tài liệu": r.orders })),
          },
          {
            name: "Theo khoa – hoa hồng",
            widths: [34, 12, 14, 16, 16, 18, 18, 16, 10, 16],
            rows: facultyRows.map((r) => ({
              "Khoa": r.faculty,
              "Bạn đọc": r.readers,
              "Sách đã mượn": r.loans,
              "Lượt phòng nhóm": r.groupBookings,
              "Lượt phòng đọc": r.readingBookings,
              "Doanh thu bài giảng (đ)": r.materialSales,
              "Doanh thu sách, GT (đ)": r.bookSales,
              "Tổng doanh thu (đ)": r.revenue,
              "Tỉ lệ (%)": r.rate,
              "Hoa hồng (đ)": r.commission,
            })),
          },
          { name: "Sách mượn nhiều", widths: [8, 18, 46, 12], rows: (top.data ?? []).map((b, i) => ({ "Hạng": i + 1, "Mã sách": b.code, "Tên sách": b.title, "Lượt mượn": b.loans })) },
          {
            name: "Tài liệu theo ngành",
            widths: [34, 16, 16, 16, 16],
            rows: (byMajor.data ?? []).map((r) => ({ "Ngành": r.major, "Đầu giáo trình": r.giaoTrinhTitles, "Bản giáo trình": r.giaoTrinhCopies, "Đầu TLTK": r.tltkTitles, "Bản TLTK": r.tltkCopies })),
          },
          { name: "Cập nhật hằng năm", rows: (annual.data ?? []).map((r) => ({ "Năm": r.year, "Đầu sách mới": r.newTitles, "Bản nhập": r.importedCopies, "Chi phí nhập (đ)": r.importCost })) },
          {
            name: `Doanh thu ${year}`,
            rows: (revenue.data?.rows ?? []).map((r) => ({ "Tháng": r.month, "Bán sách, tài liệu (đ)": r.sales, "Tiền phạt (đ)": r.fines })),
          },
        ],
        `BÁO CÁO THỐNG KÊ THƯ VIỆN HUIT – KỲ ${range[0].format("MM/YYYY")} – ${range[1].format("MM/YYYY")}`,
      );
    } finally {
      setExporting(false);
    }
  };
  const totalRevenue = facultyRows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = facultyRows.reduce((s, r) => s + r.commission, 0);

  return (
    <>
      <PageHeader
        title="Báo cáo thống kê"
        subtitle={`Kỳ báo cáo ${range[0].format("MM/YYYY")} – ${range[1].format("MM/YYYY")}`}
        extra={
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <DatePicker.RangePicker picker="month" value={range} allowClear={false} onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])} />
            <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
              In báo cáo
            </Button>
            <Button type="primary" icon={<FileExcelOutlined />} loading={exporting} onClick={toExcel}>
              Xuất Excel
            </Button>
          </div>
        }
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Section title="Khoa mượn sách, mượn phòng nhiều nhất" note="Số cuốn sách đã mượn và số lượt mượn phòng của bạn đọc thuộc từng khoa trong kỳ">
            <ResponsiveContainer width="100%" height={Math.max(260, facultyRows.length * 42)}>
              <BarChart data={facultyRows} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="faculty" width={170} fontSize={12} tickFormatter={(v: string) => v.replace("Khoa ", "")} />
                <Tooltip />
                <Legend />
                <Bar dataKey="loans" name="Sách đã mượn" fill={C1} />
                <Bar dataKey="groupBookings" name="Lượt phòng nhóm" fill={C2} />
                <Bar dataKey="readingBookings" name="Lượt phòng đọc" fill={C3} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </Col>
        <Col xs={24} xl={12}>
          <Section title="Doanh thu bán sách, tài liệu và hoa hồng theo khoa" note="Hoa hồng = doanh thu × tỉ lệ của khoa (sửa tỉ lệ ở Cài đặt → Khoa và hoa hồng)">
            <Table
              size="small"
              rowKey={(r) => r.code}
              loading={faculty.loading}
              dataSource={facultyRows.filter((r) => r.revenue > 0 || r.facultyId !== null)}
              pagination={false}
              columns={[
                { title: "Khoa", dataIndex: "faculty" },
                { title: "Bài giảng", align: "right" as const, render: (_, r) => money(r.materialSales) },
                { title: "Sách, giáo trình", align: "right" as const, render: (_, r) => money(r.bookSales) },
                { title: "Doanh thu", align: "right" as const, render: (_, r) => <strong>{money(r.revenue)}</strong> },
                { title: "Tỉ lệ", align: "right" as const, render: (_, r) => (r.facultyId === null ? "—" : `${r.rate}%`) },
                { title: "Hoa hồng", align: "right" as const, render: (_, r) => <strong style={{ color: "var(--c-primary)" }}>{money(r.commission)}</strong> },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <strong>Tổng cộng</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <strong>{money(totalRevenue)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} />
                  <Table.Summary.Cell index={5} align="right">
                    <strong>{money(totalCommission)}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Section>
        </Col>
        <Col xs={24} xl={14}>
          <Section title="Mật độ sử dụng dịch vụ" note="Số lượt mượn sách, mượn phòng và đơn mua tài liệu theo tháng">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usage.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="homeLoans" name="Mượn về nhà" stackId="a" fill={C1} />
                <Bar dataKey="onsiteLoans" name="Đọc tại chỗ" stackId="a" fill={C2} />
                <Bar dataKey="bookings" name="Mượn phòng" fill={C3} />
                <Bar dataKey="orders" name="Đơn tài liệu" fill="#4B5874" />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </Col>
        <Col xs={24} xl={10}>
          <Section title="Sách được mượn nhiều nhất">
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              loading={top.loading}
              dataSource={top.data ?? []}
              columns={[
                { title: "#", render: (_, __, i) => i + 1, width: 40 },
                { title: "Tên sách", dataIndex: "title" },
                { title: "Lượt mượn", dataIndex: "loans", align: "right" },
              ]}
            />
          </Section>
        </Col>
        <Col xs={24} xl={12}>
          <Section title="Sách, giáo trình, TLTK theo ngành học" note="Số đầu sách và số bản đang có trong kho">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byMajor.data ?? []} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="major" width={150} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="giaoTrinhCopies" name="Bản giáo trình" stackId="a" fill={C1} />
                <Bar dataKey="tltkCopies" name="Bản TLTK" stackId="a" fill={C2} />
              </BarChart>
            </ResponsiveContainer>
            <Table
              rowKey="major"
              size="small"
              pagination={false}
              dataSource={byMajor.data ?? []}
              columns={[
                { title: "Ngành", dataIndex: "major" },
                { title: "Đầu GT", dataIndex: "giaoTrinhTitles", align: "right" },
                { title: "Bản GT", dataIndex: "giaoTrinhCopies", align: "right" },
                { title: "Đầu TLTK", dataIndex: "tltkTitles", align: "right" },
                { title: "Bản TLTK", dataIndex: "tltkCopies", align: "right" },
              ]}
            />
          </Section>
        </Col>
        <Col xs={24} xl={12}>
          <Section title="Mức độ cập nhật sách mới hằng năm">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={annual.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line dataKey="newTitles" name="Đầu sách mới" stroke={C1} strokeWidth={2} />
                <Line dataKey="importedCopies" name="Bản sách nhập" stroke={C3} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <Table
              rowKey="year"
              size="small"
              pagination={false}
              dataSource={annual.data ?? []}
              columns={[
                { title: "Năm", dataIndex: "year" },
                { title: "Đầu sách mới", dataIndex: "newTitles", align: "right" },
                { title: "Bản nhập", dataIndex: "importedCopies", align: "right" },
                { title: "Chi phí nhập", render: (_, r) => money(r.importCost), align: "right" },
              ]}
            />
          </Section>
        </Col>
        <Col span={24}>
          <Section title={`Doanh thu năm ${year}`} note={revenue.data ? `Bán tài liệu ${money(revenue.data.totalSales)} · Tiền phạt đã thu ${money(revenue.data.totalFines)}` : undefined}>
            <Select
              className="no-print"
              value={year}
              style={{ width: 120, marginBottom: 12 }}
              options={Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map((y) => ({ value: y, label: `Năm ${y}` }))}
              onChange={setYear}
            />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={(revenue.data?.rows ?? []).map((r) => ({ ...r, name: `T${r.month}` }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toLocaleString("vi-VN")}k`} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
                <Bar dataKey="sales" name="Bán tài liệu" fill={C1} />
                <Bar dataKey="fines" name="Tiền phạt" fill={C3} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </Col>
      </Row>
    </>
  );
}
