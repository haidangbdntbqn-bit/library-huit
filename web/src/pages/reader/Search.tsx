import { Checkbox, Col, Empty, Input, List, Row, Select, Space, Tag } from "antd";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../api";
import BookCover from "../../components/BookCover";
import MajorSelect from "../../components/MajorSelect";
import { useLoad } from "../../hooks/usePaged";
import { label, options } from "../../utils/format";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const majorId = params.get("majorId") ? Number(params.get("majorId")) : undefined;
  const docType = params.get("docType") ?? undefined;
  const available = params.get("available") === "true";
  const page = Number(params.get("page") ?? 1);

  const set = (patch: Record<string, string | number | boolean | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === undefined || v === "" || v === false ? next.delete(k) : next.set(k, String(v))));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const { data, loading } = useLoad(
    () => api.books.list({ q, majorId, docType, available: available || undefined, page, pageSize: 10 }),
    [q, majorId, docType, available, page],
  );

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <h1 className="page-title">Tra cứu tài liệu</h1>
      <Input.Search
        size="large"
        defaultValue={q}
        key={q}
        placeholder="Tên sách, tác giả, mã sách, ISBN…"
        enterButton="Tìm"
        onSearch={(v) => set({ q: v })}
        style={{ margin: "16px 0 20px" }}
        aria-label="Từ khóa"
      />
      <Row gutter={24}>
        <Col xs={24} md={7} lg={6}>
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Ngành học
              </div>
              <MajorSelect style={{ width: "100%" }} value={majorId} onChange={(v) => set({ majorId: v })} />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Loại tài liệu
              </div>
              <Select allowClear style={{ width: "100%" }} placeholder="Tất cả" value={docType} options={options("docType")} onChange={(v) => set({ docType: v })} />
            </label>
            <Checkbox checked={available} onChange={(e) => set({ available: e.target.checked })}>
              Chỉ hiện sách còn bản
            </Checkbox>
          </div>
        </Col>
        <Col xs={24} md={17} lg={18}>
          <div className="muted" style={{ marginBottom: 8 }}>
            {data ? `${data.total} kết quả${q ? ` cho "${q}"` : ""}` : " "}
          </div>
          <List
            loading={loading}
            dataSource={data?.items ?? []}
            locale={{ emptyText: <Empty description="Không tìm thấy tài liệu phù hợp. Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc." /> }}
            pagination={
              data && data.total > data.pageSize
                ? { current: page, pageSize: data.pageSize, total: data.total, onChange: (p) => set({ page: p }), showSizeChanger: false }
                : false
            }
            renderItem={(b) => (
              <List.Item>
                <Link to={`/books/${b.id}`} style={{ display: "flex", gap: 18, width: "100%", color: "inherit" }}>
                  <div style={{ width: 72, flexShrink: 0 }}>
                    <BookCover book={b} />
                  </div>
                  <Space direction="vertical" size={4} style={{ flex: 1 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "var(--c-primary-dark)" }}>{b.title}</span>
                    <span className="muted">
                      {b.author}
                      {b.publishYear ? `, ${b.publishYear}` : ""} · Kệ {b.shelf ?? "—"}
                    </span>
                    <Space size={6} wrap>
                      <Tag>{label("docType", b.docType)}</Tag>
                      {b.major && <Tag>{b.major.name}</Tag>}
                      {b.copiesSummary?.available ? (
                        <Tag color="green">Còn {b.copiesSummary.available} bản mượn về</Tag>
                      ) : b.copiesSummary?.onsiteAvailable ? (
                        <Tag color="cyan">Đọc tại chỗ</Tag>
                      ) : (
                        <Tag color="red">Tạm hết bản</Tag>
                      )}
                    </Space>
                  </Space>
                </Link>
              </List.Item>
            )}
          />
        </Col>
      </Row>
    </div>
  );
}
