import { DeleteOutlined } from "@ant-design/icons";
import { App, Button, Input, Segmented, Select, Table, Tag } from "antd";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import CameraScan from "../../components/CameraScan";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { fmtDate, label, money, options } from "../../utils/format";

type Line = {
  barcode: string;
  title: string;
  reader: string;
  dueAt: string;
  daysLate: number;
  estimatedFine: number;
  condition: "GOOD" | "DAMAGED" | "LOST";
  note?: string;
};

export default function Returns() {
  const { message, modal } = App.useApp();
  const [barcode, setBarcode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"barcode" | "reader">("barcode");
  const [studentCode, setStudentCode] = useState("");
  const [found, setFound] = useState<{ name: string; items: Line[] } | null>(null);

  /** Tra theo MSSV: liệt kê sách đang mượn để chọn cuốn cần trả */
  const lookupReader = async (scanned?: string) => {
    const code = (typeof scanned === "string" ? scanned : studentCode).trim();
    if (!code) return;
    try {
      const r = await api.returns.byReader(code);
      const name = `${r.reader.user.fullName} (${r.reader.studentCode})`;
      setFound({
        name,
        items: r.items.map((i) => ({
          barcode: i.copy.barcode,
          title: i.copy.book.title,
          reader: name,
          dueAt: i.dueAt,
          daysLate: i.daysLate,
          estimatedFine: i.estimatedFine,
          condition: "GOOD" as const,
        })),
      });
      if (!r.items.length) message.info("Bạn đọc không có sách đang mượn");
    } catch (e) {
      setFound(null);
      message.error(errMsg(e));
    }
  };
  const pickLines = (picked: Line[]) => {
    const fresh = picked.filter((p) => !lines.some((l) => l.barcode === p.barcode));
    setLines((l) => [...l, ...fresh]);
    if (fresh.length) message.success(`Đã thêm ${fresh.length} cuốn vào danh sách trả`);
  };

  const lookup = async (scanned?: string) => {
    const code = (typeof scanned === "string" ? scanned : barcode).trim();
    if (!code) return;
    if (lines.some((l) => l.barcode === code)) return message.warning("Mã vạch đã có trong danh sách");
    try {
      const r = await api.returns.lookup(code);
      setLines((l) => [
        ...l,
        {
          barcode: code,
          title: r.copy.book.title,
          reader: `${r.loan.reader?.user.fullName} (${r.loan.reader?.studentCode})`,
          dueAt: r.dueAt,
          daysLate: r.daysLate,
          estimatedFine: r.estimatedFine,
          condition: "GOOD",
        },
      ]);
      setBarcode("");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const update = (code: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.barcode === code ? { ...l, ...patch } : l)));

  const submit = async () => {
    setSaving(true);
    try {
      const { results } = await api.returns.submit(lines.map(({ barcode: b, condition, note }) => ({ barcode: b, condition, note })));
      setLines([]);
      const totalFine = results.reduce((s, r) => s + r.fine, 0);
      modal.success({
        title: `Đã nhận trả ${results.length} cuốn`,
        width: 560,
        content: (
          <div>
            {results.map((r) => (
              <div key={r.barcode}>
                {r.title}: {label("condition", r.condition)}
                {r.daysLate > 0 && `, trễ ${r.daysLate} ngày`}
                {r.fine > 0 && ` · phạt ${money(r.fine)}`}
              </div>
            ))}
            {totalFine > 0 && <p style={{ marginTop: 12 }}>Tổng tiền phạt đã ghi vào mục Vi phạm: <strong>{money(totalFine)}</strong></p>}
          </div>
        ),
      });
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Trả sách"
        subtitle="Quét mã vạch từng cuốn (nhanh nhất khi có máy quét), hoặc tra theo MSSV rồi chọn cuốn cần trả. Hệ thống tự tính ngày trễ và tiền phạt."
      />
      <div className="panel">
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "barcode" | "reader")}
          options={[
            { value: "barcode", label: "Theo mã vạch sách" },
            { value: "reader", label: "Theo MSSV bạn đọc" },
          ]}
          style={{ marginBottom: 12 }}
        />
        {mode === "barcode" ? (
          <>
          <Input.Search
            size="large"
            placeholder="Quét hoặc nhập mã vạch sách rồi Enter"
            enterButton="Tìm"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onSearch={(v) => lookup(v)}
            style={{ maxWidth: 520 }}
            aria-label="Mã vạch sách trả"
          />
          <div style={{ marginTop: 8 }}>
            <CameraScan label="Quét mã sách bằng camera" onResult={(v) => lookup(v)} />
          </div>
          </>
        ) : (
          <>
            <Input.Search
              size="large"
              placeholder="Nhập MSSV hoặc quét thẻ sinh viên"
              enterButton="Tra sách đang mượn"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              onSearch={(v) => lookupReader(v)}
              style={{ maxWidth: 520 }}
              aria-label="MSSV bạn đọc"
            />
            <div style={{ marginTop: 8 }}>
              <CameraScan label="Quét thẻ sinh viên bằng camera" onResult={(v) => { setStudentCode(v); lookupReader(v); }} />
            </div>
            {found && found.items.length > 0 && (
              <Table<Line>
                rowKey="barcode"
                size="small"
                style={{ marginTop: 12 }}
                pagination={false}
                dataSource={found.items}
                title={() => (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Sách đang mượn của {found.name}</strong>
                    <Button onClick={() => pickLines(found.items)}>Trả tất cả</Button>
                  </div>
                )}
                columns={[
                  { title: "Mã vạch", dataIndex: "barcode" },
                  { title: "Tên sách", dataIndex: "title" },
                  { title: "Hạn trả", render: (_, l) => fmtDate(l.dueAt) },
                  { title: "Trễ", render: (_, l) => (l.daysLate ? <Tag color="red">{l.daysLate} ngày</Tag> : "Đúng hạn") },
                  {
                    title: "",
                    align: "right" as const,
                    render: (_, l) =>
                      lines.some((x) => x.barcode === l.barcode) ? (
                        <Tag color="blue">Đã chọn</Tag>
                      ) : (
                        <Button size="small" type="primary" onClick={() => pickLines([l])}>
                          Chọn trả
                        </Button>
                      ),
                  },
                ]}
              />
            )}
          </>
        )}
        <Table<Line>
          rowKey="barcode"
          style={{ marginTop: 16 }}
          pagination={false}
          dataSource={lines}
          scroll={{ x: 900 }}
          locale={{ emptyText: "Chưa có sách nào trong lượt trả" }}
          columns={[
            { title: "Mã vạch", dataIndex: "barcode" },
            { title: "Tên sách", dataIndex: "title" },
            { title: "Bạn đọc", dataIndex: "reader" },
            {
              title: "Hạn trả",
              render: (_, l) => (
                <span>
                  {fmtDate(l.dueAt)} {l.daysLate > 0 ? <Tag color="red">Trễ {l.daysLate} ngày</Tag> : <Tag color="green">Đúng hạn</Tag>}
                </span>
              ),
            },
            { title: "Phạt trễ (dự kiến)", render: (_, l) => (l.estimatedFine ? money(l.estimatedFine) : "—") },
            {
              title: "Tình trạng sách",
              render: (_, l) => (
                <Select style={{ width: 140 }} value={l.condition} options={options("condition")} onChange={(condition) => update(l.barcode, { condition: condition as Line["condition"] })} />
              ),
            },
            {
              title: "Ghi chú",
              render: (_, l) =>
                l.condition !== "GOOD" ? (
                  <Input placeholder="Mô tả hư hỏng" value={l.note} onChange={(e) => update(l.barcode, { note: e.target.value })} />
                ) : (
                  <StatusTag kind="condition" value="GOOD" />
                ),
            },
            {
              title: "",
              render: (_, l) => (
                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Bỏ" onClick={() => setLines((x) => x.filter((y) => y.barcode !== l.barcode))} />
              ),
            },
          ]}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Button
            type="primary"
            size="large"
            disabled={!lines.length}
            loading={saving}
            onClick={() =>
              lines.some((l) => l.condition !== "GOOD")
                ? modal.confirm({ title: "Xác nhận ghi nhận sách hỏng / mất?", content: "Hệ thống sẽ tạo vi phạm và tiền phạt tương ứng.", okText: "Xác nhận", cancelText: "Xem lại", onOk: submit })
                : submit()
            }
          >
            Xác nhận trả {lines.length} cuốn
          </Button>
        </div>
      </div>
    </>
  );
}
