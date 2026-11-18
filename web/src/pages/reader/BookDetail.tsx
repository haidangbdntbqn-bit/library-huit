import { App, Button, Col, Descriptions, Result, Row, Skeleton, Tag } from "antd";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import BookCover from "../../components/BookCover";
import { useLoad } from "../../hooks/usePaged";
import { useAuth } from "../../store/auth";
import { label } from "../../utils/format";

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [sending, setSending] = useState(false);
  const { data: book, loading } = useLoad(() => api.books.get(Number(id)), [id]);

  if (loading) return <div className="container" style={{ paddingTop: 32 }}><Skeleton active /></div>;
  if (!book) return <Result status="404" title="Không tìm thấy đầu sách" extra={<Link to="/search">Quay lại tra cứu</Link>} />;
  const s = book.copiesSummary;

  const request = async (loanType: "HOME" | "ONSITE") => {
    setSending(true);
    try {
      await api.borrowRequests.create(book.id, loanType);
      modal.success({
        title: "Đã gửi yêu cầu mượn",
        content: `Hình thức: ${loanType === "HOME" ? "mượn về nhà" : "đọc tại chỗ"}. Thư viện sẽ soạn sách cho bạn; khi trạng thái chuyển sang "Sẵn sàng nhận", hãy mang thẻ sinh viên đến quầy để nhận sách.`,
        okText: "Xem yêu cầu của tôi",
        onOk: () => navigate("/my-loans?tab=requests"),
      });
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <Link to="/search">← Kết quả tra cứu</Link>
      <Row gutter={[40, 24]} style={{ marginTop: 20 }}>
        <Col xs={12} sm={8} md={6}>
          <BookCover book={book} />
        </Col>
        <Col xs={24} sm={16} md={18}>
          <Tag>{label("docType", book.docType)}</Tag>
          <h1 style={{ fontSize: 32, margin: "10px 0 6px", lineHeight: 1.15 }}>{book.title}</h1>
          <p className="muted" style={{ fontSize: 16, marginTop: 0 }}>
            {book.author}
          </p>
          <div className="panel" style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center", margin: "20px 0" }}>
            <div className="kpi">
              <span className="value" style={{ color: s?.available ? "var(--c-primary)" : "var(--c-warn)" }}>{s?.available ?? 0}</span>
              <span className="label">bản mượn về nhà</span>
            </div>
            <div className="kpi">
              <span className="value">{s?.onsiteAvailable ?? 0}</span>
              <span className="label">bản đọc tại chỗ</span>
            </div>
            <div className="kpi">
              <span className="value">{s?.borrowed ?? 0}</span>
              <span className="label">đang được mượn</span>
            </div>
            <div style={{ marginLeft: "auto" }}>
              {user?.role === "READER" ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button type="primary" size="large" disabled={!s?.available} loading={sending} onClick={() => request("HOME")}>
                    Đặt mượn về nhà
                  </Button>
                  <Button size="large" disabled={!((s?.available ?? 0) + (s?.onsiteAvailable ?? 0))} loading={sending} onClick={() => request("ONSITE")}>
                    Đặt đọc tại chỗ
                  </Button>
                </div>
              ) : !user ? (
                <Button type="primary" size="large" onClick={() => navigate("/login", { state: { from: `/books/${book.id}` } })}>
                  Đăng nhập để đặt mượn
                </Button>
              ) : null}
            </div>
          </div>
          <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
            <Descriptions.Item label="Mã sách">{book.code}</Descriptions.Item>
            <Descriptions.Item label="Vị trí kệ">{book.shelf ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Nhà xuất bản">{book.publisher ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Năm xuất bản">{book.publishYear ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="ISBN">{book.isbn ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Ngành">{book.major?.name ?? "Dùng chung"}</Descriptions.Item>
          </Descriptions>
          {book.description && <p style={{ marginTop: 20, maxWidth: "70ch", lineHeight: 1.7 }}>{book.description}</p>}
        </Col>
      </Row>
    </div>
  );
}
