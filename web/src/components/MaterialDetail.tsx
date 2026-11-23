import { Button, Descriptions, Empty, Modal, Skeleton, Tag } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api";
import type { Material } from "../types";
import { label, money } from "../utils/format";
import StatusTag from "./StatusTag";
import GeneratedCover from "./GeneratedCover";

const CAT_TEXT: Record<string, string> = { BAI_GIANG: "Bài giảng", GIAO_TRINH: "Giáo trình", SACH_THAM_KHAO: "Sách tham khảo" };

/** Bìa tự sinh từ dữ liệu tài liệu (tên, giảng viên, ngành) */
export function MaterialCover({ m, width }: { m: Material; width?: number }) {
  return (
    <GeneratedCover
      width={width}
      info={{
        seed: m.code,
        kind: CAT_TEXT[m.category] ?? "Tài liệu",
        title: m.title,
        author: m.lecturer,
        majorCode: m.major?.code,
        majorName: m.major ? `Ngành ${m.major.name}` : "Dùng chung các ngành",
        footnote: m.format === "DIGITAL" ? "Bản số · Nhà sách thư viện HUIT" : "Bản in · Nhà sách thư viện HUIT",
        light: m.category === "SACH_THAM_KHAO",
      }}
    />
  );
}

type Suggest = Awaited<ReturnType<typeof api.materials.suggestions>>;

/** Một dải sách gợi ý cuộn ngang, giống "sản phẩm liên quan" trên trang mua sắm */
function Shelf({ title, note, items, onOpen, onAdd }: { title: string; note?: string; items: Material[]; onOpen: (m: Material) => void; onAdd: (m: Material) => void }) {
  if (!items.length) return null;
  return (
    <section style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>{title}</h4>
        {note && <span className="muted" style={{ fontSize: 13 }}>{note}</span>}
      </div>
      <div className="shelf">
        {items.map((m) => {
          const out = m.format === "PRINT" && m.stock === 0;
          return (
            <div key={m.id} className="shelf-item">
              <button type="button" className="shelf-open" onClick={() => onOpen(m)} aria-label={`Xem ${m.title}`}>
                <MaterialCover m={m} />
                <div className="shelf-title">{m.title}</div>
              </button>
              <div className="shelf-price">{money(m.price)}</div>
              <Button size="small" block disabled={out} onClick={() => onAdd(m)}>
                {out ? "Hết hàng" : "Thêm vào giỏ"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Cửa sổ chi tiết sách / tài liệu kèm gợi ý: cùng chủ đề, thường mua kèm, cùng khoa, dành cho ngành của bạn */
export default function MaterialDetail({ id, onClose, onAdd }: { id: number | null; onClose: () => void; onAdd: (m: Material) => void }) {
  const [current, setCurrent] = useState<number | null>(id);
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setCurrent(id), [id]);
  useEffect(() => {
    if (!current) return;
    setLoading(true);
    api.materials
      .suggestions(current)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    document.querySelector(".ant-modal-body")?.scrollTo({ top: 0 });
  }, [current]);

  const m = data?.material;
  const out = m ? m.format === "PRINT" && m.stock === 0 : true;
  const open = (x: Material) => setCurrent(x.id);
  const empty = data && !data.related.length && !data.boughtTogether.length && !data.sameFaculty.length && !data.forYou.length;

  return (
    <Modal open={id !== null} onCancel={onClose} footer={null} width={860} title={null} destroyOnClose>
      {loading && !data ? (
        <Skeleton active />
      ) : m ? (
        <>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ width: 160, flexShrink: 0 }}>
              <MaterialCover m={m} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <StatusTag kind="category" value={m.category} />
                <Tag>{label("format", m.format)}</Tag>
              </div>
              <h2 style={{ margin: "8px 0 4px" }}>{m.title}</h2>
              <div className="muted">{m.lecturer}</div>
              <div className="display" style={{ fontSize: 26, margin: "12px 0", color: "var(--c-primary)" }}>
                {money(m.price)}
              </div>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Mã">{m.code}</Descriptions.Item>
                <Descriptions.Item label="Ngành / khoa">{m.major ? `${m.major.name} · ${data?.facultyName}` : "Dùng chung các ngành"}</Descriptions.Item>
                <Descriptions.Item label="Tình trạng">{m.format === "DIGITAL" ? "Bản số, nhận qua email sau khi thanh toán" : out ? "Hết hàng" : `Còn ${m.stock} cuốn`}</Descriptions.Item>
                <Descriptions.Item label="Đã bán">{m.sold} cuốn</Descriptions.Item>
              </Descriptions>
              {m.description && <p style={{ marginTop: 8 }}>{m.description}</p>}
              <Button type="primary" size="large" disabled={out} onClick={() => onAdd(m)}>
                {out ? "Hết hàng" : "Thêm vào giỏ"}
              </Button>
            </div>
          </div>

          <Shelf title="Sách, tài liệu liên quan" note="cùng môn học, chủ đề" items={data!.related} onOpen={open} onAdd={onAdd} />
          <Shelf title="Thường được mua cùng" note="theo đơn hàng của bạn đọc khác" items={data!.boughtTogether} onOpen={open} onAdd={onAdd} />
          <Shelf title={`Bán chạy cùng ${data!.facultyName}`} items={data!.sameFaculty} onOpen={open} onAdd={onAdd} />
          <Shelf title="Dành cho ngành của bạn" items={data!.forYou} onOpen={open} onAdd={onAdd} />
          {empty && <Empty description="Chưa có gợi ý cho tài liệu này" style={{ marginTop: 24 }} />}
        </>
      ) : (
        <Empty description="Không tải được thông tin tài liệu" />
      )}
    </Modal>
  );
}
