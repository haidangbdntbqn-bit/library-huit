import { DeleteOutlined } from "@ant-design/icons";
import { Alert, App, Button, Col, DatePicker, Input, Radio, Result, Row, Table } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import CameraScan from "../../components/CameraScan";
import PageHeader from "../../components/PageHeader";
import ReaderLookup from "../../components/ReaderLookup";
import StatusTag from "../../components/StatusTag";
import type { Book, BookCopy, Loan, Reader } from "../../types";
import { fmtDate, label } from "../../utils/format";

type Line = BookCopy & { book: Book };

export default function LoanCreate() {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const [reader, setReader] = useState<Reader | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [barcode, setBarcode] = useState("");
  const [loanType, setLoanType] = useState<"HOME" | "ONSITE">("HOME");
  const [loanDays, setLoanDays] = useState(14);
  const [dueAt, setDueAt] = useState<Dayjs>(dayjs().add(14, "day"));
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Loan | null>(null);
  const initialCode = params.get("code") ?? undefined;
  const fromPickup = params.get("pickup") === "1";
  const [reserved, setReserved] = useState<string[]>([]);

  useEffect(() => {
    api.settings.get().then((s) => {
      setLoanDays(s.values.LOAN_DAYS);
      if (!fromPickup) setDueAt(dayjs().add(s.values.LOAN_DAYS, "day"));
    });
    if (initialCode) api.readers.lookup(initialCode).then(setReader).catch(() => undefined);
    // Nhận sách từ yêu cầu mượn trực tuyến: tự điền mã vạch đã giữ, hình thức và hạn trả
    if (initialCode && fromPickup) {
      api.borrowRequests
        .pickup(initialCode)
        .then(async (p) => {
          setLoanType(p.loanType);
          setDueAt(dayjs(p.dueAt));
          setReserved(p.barcodes);
          const copies = await Promise.all(p.barcodes.map((b) => api.copies.byBarcode(b).catch(() => null)));
          setLines(copies.filter((c): c is Line => !!c));
        })
        .catch((e) => message.error(errMsg(e)));
    }
  }, [initialCode, fromPickup]);

  const addBarcode = async (scanned?: string) => {
    const code = (typeof scanned === "string" ? scanned : barcode).trim();
    if (!code) return;
    if (lines.some((l) => l.barcode === code)) return message.warning("Mã vạch đã có trên phiếu");
    try {
      let copy: Line;
      try {
        copy = await api.copies.byBarcode(code);
      } catch {
        // Nhập mã đầu sách (ví dụ GT-CNTT-001): tự chọn một bản đang sẵn sàng
        const found = (await api.books.list({ q: code, pageSize: 5 })).items.find((b) => b.code.toLowerCase() === code.toLowerCase());
        if (!found) return message.error("Không tìm thấy mã vạch hoặc mã sách này");
        const copies = await api.books.copies(found.id);
        const free = copies.find((c) => c.status === "AVAILABLE" && (loanType === "ONSITE" || !c.onsiteOnly) && !lines.some((l) => l.barcode === c.barcode));
        if (!free) return message.error(`"${found.title}" hiện không còn bản ${loanType === "HOME" ? "mượn về nhà" : "sẵn sàng"}`);
        copy = { ...free, book: found };
        message.info(`Đã chọn bản ${free.barcode} của "${found.title}"`);
      }
      const heldForReader = copy.status === "RESERVED" && reserved.includes(copy.barcode);
      if (copy.status !== "AVAILABLE" && !heldForReader) return message.error(`Bản sách đang ở trạng thái: ${label("copy", copy.status)}`);
      if (loanType === "HOME" && copy.onsiteOnly) return message.error("Bản này chỉ đọc tại chỗ");
      setLines((l) => [...l, copy]);
      setBarcode("");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const submit = async () => {
    if (!reader) return;
    setSaving(true);
    try {
      const loan = await api.loans.create({
        readerId: reader.id,
        loanType,
        barcodes: lines.map((l) => l.barcode),
        dueAt: loanType === "HOME" ? dueAt.toISOString() : undefined,
      });
      setCreated(loan);
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setReader(null);
    setLines([]);
    setReserved([]);
    setLoanType("HOME");
    setDueAt(dayjs().add(loanDays, "day"));
  };

  if (created) {
    return (
      <Result
        status="success"
        title={`Đã lập phiếu ${created.code}`}
        subTitle={`${created.reader?.user.fullName} mượn ${created.items.length} cuốn, hạn trả ${fmtDate(created.items[0]?.dueAt)}`}
        extra={
          <Button type="primary" onClick={reset}>
            Lập phiếu mới
          </Button>
        }
      />
    );
  }

  const canBorrow = reader && reader.card?.status === "ACTIVE" && reader.status === "ACTIVE";

  return (
    <>
      <PageHeader title="Lập phiếu mượn" subtitle="Quét thẻ bạn đọc, quét mã vạch (hoặc nhập mã sách) và chọn hình thức mượn" />
      {fromPickup && reserved.length > 0 && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Phiếu đã được điền sẵn từ ${reserved.length} yêu cầu mượn trực tuyến: mã vạch đã giữ, hình thức ${loanType === "HOME" ? "mượn về nhà" : "đọc tại chỗ"}, hạn trả ${dueAt.format("DD/MM/YYYY")}. Kiểm tra rồi bấm Lập phiếu.`}
        />
      )}
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={10}>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>1. Bạn đọc</h3>
            <ReaderLookup value={reader} onChange={setReader} defaultCode={initialCode} />
          </div>
        </Col>
        <Col xs={24} xl={14}>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>2. Sách mượn</h3>
            <Input.Search
              placeholder="Quét mã vạch (VD GT-CNTT-001-002) hoặc nhập mã sách (GT-CNTT-001) rồi Enter"
              enterButton="Thêm"
              value={barcode}
              disabled={!canBorrow}
              onChange={(e) => setBarcode(e.target.value)}
              onSearch={(v) => addBarcode(v)}
              aria-label="Mã vạch sách"
            />
            {canBorrow && (
              <div style={{ marginTop: 8 }}>
                <CameraScan label="Quét mã sách bằng camera" onResult={(v) => addBarcode(v)} />
              </div>
            )}
            <Table
              rowKey="id"
              size="small"
              style={{ marginTop: 12 }}
              pagination={false}
              dataSource={lines}
              locale={{ emptyText: canBorrow ? "Chưa có sách trên phiếu" : "Tìm bạn đọc hợp lệ trước khi thêm sách" }}
              columns={[
                { title: "Mã vạch", dataIndex: "barcode" },
                { title: "Tên sách", render: (_, l) => l.book.title },
                { title: "Kệ", render: (_, l) => l.book.shelf },
                { title: "", render: (_, l) => (l.onsiteOnly ? <StatusTag kind="loanType" value="ONSITE" /> : null) },
                {
                  title: "",
                  render: (_, l) => (
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label="Bỏ" onClick={() => setLines((x) => x.filter((y) => y.id !== l.id))} />
                  ),
                },
              ]}
            />
            <h3>3. Hình thức mượn</h3>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <Radio.Group
                value={loanType}
                optionType="button"
                onChange={(e) => setLoanType(e.target.value)}
                options={[
                  { value: "HOME", label: "Mượn về nhà" },
                  { value: "ONSITE", label: "Đọc tại chỗ (trả trong ngày)" },
                ]}
              />
              {loanType === "HOME" && (
                <span>
                  Hạn trả{" "}
                  <DatePicker
                    value={dueAt}
                    allowClear={false}
                    format="DD/MM/YYYY"
                    disabledDate={(d) => d.isBefore(dayjs(), "day")}
                    onChange={(d) => d && setDueAt(d)}
                  />
                </span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <Button type="primary" size="large" disabled={!canBorrow || !lines.length} loading={saving} onClick={submit}>
                Lập phiếu ({lines.length} cuốn)
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}
