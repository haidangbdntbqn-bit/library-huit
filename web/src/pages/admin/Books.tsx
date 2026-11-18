import { App, Button, Col, Drawer, Form, Input, InputNumber, Modal, Row, Select, Space, Switch, Table } from "antd";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import Barcode128 from "../../components/Barcode128";
import MajorSelect from "../../components/MajorSelect";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { useLoad, usePaged } from "../../hooks/usePaged";
import type { Book, BookCopy } from "../../types";
import { fmtDate, label, options } from "../../utils/format";

/** Nhãn mã vạch dán lên từng bản sách: in ra giấy decal hoặc mở trên màn hình để quét thử bằng app */
function Labels({ book, copies, onClose }: { book: Book; copies: BookCopy[]; onClose: () => void }) {
  return (
    <Modal open title={`Nhãn mã vạch – ${book.title}`} width={860} onCancel={onClose} okText="In nhãn" cancelText="Đóng" onOk={() => {
        document.body.classList.add("printing-labels");
        window.print();
        document.body.classList.remove("printing-labels");
      }}>
      <div className="print-area label-grid">
        {copies
          .filter((c) => c.status !== "LIQUIDATED")
          .map((c) => (
            <div key={c.id} className="label">
              <div className="label-head">THƯ VIỆN HUIT · Kệ {book.shelf ?? "—"}</div>
              <div className="label-title">{book.title}</div>
              <Barcode128 value={c.barcode} height={38} module={1.3} />
              {c.onsiteOnly && <div className="label-note">CHỈ ĐỌC TẠI CHỖ</div>}
            </div>
          ))}
      </div>
    </Modal>
  );
}

function Copies({ book }: { book: Book }) {
  const { message } = App.useApp();
  const { data, loading, reload } = useLoad(() => api.books.copies(book.id), [book.id]);
  const [labels, setLabels] = useState(false);

  const update = async (c: BookCopy, body: Record<string, unknown>) => {
    try {
      await api.copies.update(c.id, body);
      message.success(`Đã cập nhật ${c.barcode}`);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
    <Button style={{ marginBottom: 12 }} onClick={() => setLabels(true)} disabled={!data?.length}>
      In nhãn mã vạch
    </Button>
    {labels && <Labels book={book} copies={data ?? []} onClose={() => setLabels(false)} />}
    <Table<BookCopy>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={data ?? []}
      pagination={{ pageSize: 20 }}
      columns={[
        { title: "Mã vạch", dataIndex: "barcode" },
        {
          title: "Trạng thái",
          render: (_, c) =>
            ["BORROWED", "RESERVED", "LIQUIDATED"].includes(c.status) ? (
              <StatusTag kind="copy" value={c.status} />
            ) : (
              <Select size="small" style={{ width: 120 }} value={c.status} options={options("copy", ["AVAILABLE", "DAMAGED", "LOST"])} onChange={(status) => update(c, { status })} />
            ),
        },
        {
          title: "Chỉ đọc tại chỗ",
          render: (_, c) => <Switch size="small" checked={c.onsiteOnly} disabled={c.status === "BORROWED" || c.status === "LIQUIDATED"} onChange={(onsiteOnly) => update(c, { onsiteOnly })} />,
        },
        { title: "Tình trạng", dataIndex: "condition" },
        { title: "Người mượn", render: (_, c) => c.loanItems?.[0]?.loan.reader?.user.fullName ?? "" },
        { title: "Phiếu nhập", render: (_, c) => (c.import ? `${c.import.code} (${fmtDate(c.import.importedAt)})` : "—") },
        { title: "Thanh lý", render: (_, c) => c.liquidation?.code ?? "" },
      ]}
    />
    </>
  );
}

export default function Books() {
  const { message } = App.useApp();
  const { tableProps, setFilter, reload } = usePaged<Book>(api.books.list);
  const [editing, setEditing] = useState<Book | "new" | null>(null);
  const [copiesOf, setCopiesOf] = useState<Book | null>(null);
  const [form] = Form.useForm();

  const open = (b: Book | "new") => {
    setEditing(b);
    form.resetFields();
    if (b !== "new") form.setFieldsValue(b);
  };

  const save = async (v: Record<string, unknown>) => {
    try {
      if (editing === "new") await api.books.create(v);
      else if (editing) await api.books.update(editing.id, v);
      message.success("Đã lưu đầu sách");
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Sách, giáo trình, tài liệu tham khảo"
        subtitle="Thêm đầu sách ở đây, sau đó lập phiếu nhập để tạo bản sách có mã vạch"
        extra={
          <Button type="primary" onClick={() => open("new")}>
            Thêm đầu sách
          </Button>
        }
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="Tên, tác giả, mã, ISBN" allowClear style={{ width: 280 }} onSearch={(q) => setFilter({ q })} />
        <MajorSelect style={{ width: 220 }} onChange={(majorId) => setFilter({ majorId })} />
        <Select allowClear placeholder="Loại" style={{ width: 200 }} options={options("docType")} onChange={(docType) => setFilter({ docType })} />
      </Space>
      <Table<Book>
        {...tableProps}
        scroll={{ x: 1000 }}
        columns={[
          { title: "Mã", dataIndex: "code" },
          { title: "Tên sách", dataIndex: "title" },
          { title: "Tác giả", dataIndex: "author" },
          { title: "Loại", render: (_, b) => label("docType", b.docType) },
          { title: "Ngành", render: (_, b) => b.major?.name ?? "Dùng chung" },
          { title: "Kệ", dataIndex: "shelf" },
          {
            title: "Bản sách",
            render: (_, b) =>
              `${b.copiesSummary?.available ?? 0} sẵn · ${b.copiesSummary?.borrowed ?? 0} mượn · ${b.copiesSummary?.total ?? 0} tổng`,
          },
          {
            title: "",
            render: (_, b) => (
              <Space>
                <Button size="small" onClick={() => setCopiesOf(b)}>
                  Bản sách
                </Button>
                <Button size="small" onClick={() => open(b)}>
                  Sửa
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={editing !== null}
        title={editing === "new" ? "Thêm đầu sách" : "Sửa đầu sách"}
        okText="Lưu"
        cancelText="Hủy"
        width={720}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ docType: "GIAO_TRINH" }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="Mã sách" rules={[{ required: true }]}>
                <Input placeholder="GT-CNTT-004" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="title" label="Tên sách" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="author" label="Tác giả" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="publisher" label="Nhà xuất bản">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="publishYear" label="Năm xuất bản">
                <InputNumber min={1900} max={2100} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isbn" label="ISBN">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="shelf" label="Vị trí kệ">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="docType" label="Loại tài liệu" rules={[{ required: true }]}>
                <Select options={options("docType")} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="majorId" label="Ngành (để trống nếu dùng chung)">
                <MajorSelect />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="coverUrl" label="Link ảnh bìa (không bắt buộc)" rules={[{ type: "url", message: "Link không hợp lệ" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer width={900} open={!!copiesOf} onClose={() => setCopiesOf(null)} title={`Bản sách: ${copiesOf?.title ?? ""}`} destroyOnClose>
        {copiesOf && <Copies book={copiesOf} />}
      </Drawer>
    </>
  );
}
