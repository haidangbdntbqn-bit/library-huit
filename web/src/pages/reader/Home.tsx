import { Button, Col, Empty, Input, Row, Skeleton, Tag } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import BookCover from "../../components/BookCover";
import StatusTag from "../../components/StatusTag";
import { DueBanner } from "../../components/Notifications";
import { useLoad } from "../../hooks/usePaged";
import { useAuth } from "../../store/auth";
import { daysLeft, fmtDate } from "../../utils/format";

const QUICK = ["Cơ sở dữ liệu", "Lập trình", "Kế toán", "Marketing", "Thực phẩm"];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: books, loading } = useLoad(() => api.books.list({ pageSize: 10, sort: "newest" }));
  const { data: rooms } = useLoad(() => api.rooms.list({ roomType: "GROUP" }));
  const { data: loans } = useLoad(() => (user?.role === "READER" ? api.loans.mine() : Promise.resolve([])), [user?.id]);

  const openItems = (loans ?? []).flatMap((l) => l.items.filter((i) => !i.returnedAt)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="container">
      <section className="hero">
        <h1>Tìm giáo trình và tài liệu cho môn học của bạn</h1>
        <p>Tra cứu theo tên sách, tác giả hoặc mã ISBN. Đặt mượn trực tuyến rồi đến quầy nhận sách.</p>
        <Input.Search
          size="large"
          placeholder="Tên sách, tác giả, ISBN…"
          enterButton="Tìm kiếm"
          style={{ maxWidth: 680 }}
          aria-label="Tìm sách"
          onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
        />
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted">Gợi ý:</span>
          {QUICK.map((q) => (
            <Tag key={q} style={{ cursor: "pointer", padding: "4px 10px" }} onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}>
              {q}
            </Tag>
          ))}
        </div>
      </section>

      {user?.role === "READER" && <DueBanner />}

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={16}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ fontSize: 22, margin: "0 0 16px" }}>Sách mới về thư viện</h2>
            <Link to="/search">Xem tất cả</Link>
          </div>
          {loading ? (
            <Skeleton active />
          ) : books?.items.length ? (
            <div className="book-grid">
              {books.items.map((b) => (
                <Link key={b.id} to={`/books/${b.id}`} className="book-card">
                  <BookCover book={b} />
                  <span className="name">{b.title}</span>
                  <span style={{ fontSize: 13, color: b.copiesSummary?.available ? "var(--c-primary)" : "var(--c-warn)" }}>
                    {b.copiesSummary?.available ? `Còn ${b.copiesSummary.available} bản mượn về` : b.copiesSummary?.onsiteAvailable ? "Chỉ đọc tại chỗ" : "Tạm hết bản"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty description="Chưa có sách trong thư viện" />
          )}
        </Col>

        <Col xs={24} lg={8} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {user?.role === "READER" && (
            <div className="panel">
              <h3 style={{ margin: "0 0 12px" }}>Sách đang mượn</h3>
              {openItems.length ? (
                openItems.slice(0, 3).map((i) => {
                  const left = daysLeft(i.dueAt);
                  return (
                    <div key={i.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--c-line)" }}>
                      <div style={{ fontWeight: 600 }}>{i.copy.book.title}</div>
                      <div style={{ fontSize: 13, color: left < 0 ? "var(--c-danger)" : left <= 2 ? "var(--c-warn)" : "var(--c-muted)" }}>
                        Hạn trả {fmtDate(i.dueAt)} {left < 0 ? `(quá ${-left} ngày)` : `(còn ${left} ngày)`}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="muted">Bạn chưa mượn cuốn nào.</p>
              )}
              <Button block style={{ marginTop: 12 }} onClick={() => navigate("/my-loans")}>
                Quản lý sách đang mượn
              </Button>
            </div>
          )}

          <div className="panel">
            <h3 style={{ margin: "0 0 12px" }}>Phòng học nhóm lúc này</h3>
            {(rooms ?? []).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span>
                  {r.name} <span className="muted">({r.capacity} chỗ)</span>
                </span>
                <StatusTag kind="roomState" value={r.currentState} />
              </div>
            ))}
            <Button type="primary" block style={{ marginTop: 12 }} onClick={() => navigate("/rooms")}>
              Đặt phòng
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}
