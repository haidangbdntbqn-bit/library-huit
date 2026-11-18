import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, InputNumber, Modal, Switch, Table } from "antd";
import { useState } from "react";
import { api, type ImportSlip } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import { fmtDateTime, money } from "../../utils/format";
import BookSelect from "./BookSelect";

export default function Imports() {
  const { message } = App.useApp();
  const { tableProps, reload } = usePaged<ImportSlip>(api.imports.list);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<ImportSlip | null>(null);
  const [form] = Form.useForm();

  const create = async (v: Record<string, unknown>) => {
    try {
      const slip = await api.imports.create(v);
      message.success(`Đã lập phiếu nhập ${slip.code}`);
      setCreating(false);
      form.resetFields();
      reload();
      setDetail(await api.imports.get(slip.id));
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Nhập sách"
        subtitle="Mỗi dòng phiếu nhập tạo ra các bản sách mới kèm mã vạch để dán lên sách"
        extra={
          <Button type="primary" onClick={() => setCreating(true)}>
            Lập phiếu nhập
          </Button>
        }
      />
      <Table<ImportSlip>
        {...tableProps}
        onRow={(r) => ({ onClick: async () => setDetail(await api.imports.get(r.id)), style: { cursor: "pointer" } })}
        columns={[
          { title: "Số phiếu", dataIndex: "code" },
          { title: "Ngày nhập", render: (_, r) => fmtDateTime(r.importedAt) },
          { title: "Nhà cung cấp", render: (_, r) => r.supplier ?? "—" },
          { title: "Số bản", render: (_, r) => r._count?.copies },
          { title: "Tổng tiền", render: (_, r) => money(r.totalCost) },
          { title: "Người lập", render: (_, r) => r.staff.user.fullName },
        ]}
      />

      <Modal open={creating} title="Lập phiếu nhập sách" width={860} okText="Lưu phiếu nhập" cancelText="Hủy" onCancel={() => setCreating(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ items: [{ quantity: 1, unitPrice: 0, onsiteOnly: false }] }}>
          <Form.Item name="supplier" label="Nhà cung cấp">
            <Input />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <div key={f.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Form.Item name={[f.name, "bookId"]} rules={[{ required: true, message: "Chọn sách" }]} style={{ flex: 1 }}>
                      <BookSelect />
                    </Form.Item>
                    <Form.Item name={[f.name, "quantity"]} rules={[{ required: true }]}>
                      <InputNumber min={1} max={200} addonAfter="bản" style={{ width: 130 }} />
                    </Form.Item>
                    <Form.Item name={[f.name, "unitPrice"]}>
                      <InputNumber min={0} step={1000} addonAfter="đ" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item name={[f.name, "onsiteOnly"]} valuePropName="checked" tooltip="Chỉ đọc tại chỗ">
                      <Switch checkedChildren="Tại chỗ" unCheckedChildren="Về nhà" />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label="Xóa dòng" onClick={() => remove(f.name)} disabled={fields.length === 1} />
                  </div>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add({ quantity: 1, unitPrice: 0, onsiteOnly: false })}>
                  Thêm dòng
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item name="note" label="Ghi chú" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!detail} title={`Phiếu nhập ${detail?.code ?? ""}`} width={760} footer={<Button onClick={() => window.print()}>In mã vạch</Button>} onCancel={() => setDetail(null)}>
        <Table
          rowKey="id"
          size="small"
          dataSource={detail?.copies ?? []}
          pagination={{ pageSize: 15 }}
          columns={[
            { title: "Mã vạch", dataIndex: "barcode" },
            { title: "Sách", render: (_, c) => c.book.title },
            { title: "Đọc tại chỗ", render: (_, c) => (c.onsiteOnly ? "Có" : "") },
            { title: "Trạng thái", render: (_, c) => <StatusTag kind="copy" value={c.status} /> },
          ]}
        />
      </Modal>
    </>
  );
}
