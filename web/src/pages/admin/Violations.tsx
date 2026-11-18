import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table } from "antd";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import ReaderLookup from "../../components/ReaderLookup";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import type { Reader, Violation } from "../../types";
import { fmtDate, money, options } from "../../utils/format";

export default function Violations() {
  const { message } = App.useApp();
  const { tableProps, setFilter, reload } = usePaged<Violation>(api.violations.list, { status: "UNPAID" });
  const [creating, setCreating] = useState(false);
  const [reader, setReader] = useState<Reader | null>(null);
  const [form] = Form.useForm();

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  const create = async (v: Record<string, unknown>) => {
    if (!reader) return message.error("Chọn bạn đọc trước");
    await act(() => api.violations.create({ ...v, readerId: reader.id }), "Đã ghi nhận vi phạm");
    setCreating(false);
    setReader(null);
    form.resetFields();
  };

  return (
    <>
      <PageHeader
        title="Vi phạm"
        subtitle="Vi phạm trả trễ, làm hỏng, làm mất được tạo tự động khi nhận trả sách"
        extra={<Button onClick={() => setCreating(true)}>Ghi nhận vi phạm khác</Button>}
      />
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="MSSV, họ tên" allowClear style={{ width: 240 }} onSearch={(q) => setFilter({ q })} />
        <Select allowClear placeholder="Trạng thái" defaultValue="UNPAID" style={{ width: 160 }} options={options("violation")} onChange={(status) => setFilter({ status })} />
        <Select allowClear placeholder="Loại vi phạm" style={{ width: 160 }} options={options("violationType")} onChange={(type) => setFilter({ type })} />
      </Space>
      <Table<Violation>
        {...tableProps}
        scroll={{ x: 900 }}
        columns={[
          { title: "Ngày", render: (_, v) => fmtDate(v.createdAt) },
          { title: "Bạn đọc", render: (_, v) => `${v.reader?.user.fullName} (${v.reader?.studentCode})` },
          { title: "Loại", render: (_, v) => <StatusTag kind="violationType" value={v.type} /> },
          { title: "Nội dung", dataIndex: "description" },
          { title: "Tiền phạt", render: (_, v) => money(v.fineAmount) },
          { title: "Trạng thái", render: (_, v) => <StatusTag kind="violation" value={v.status} /> },
          {
            title: "",
            render: (_, v) =>
              v.status === "UNPAID" && (
                <Space>
                  <Popconfirm title={`Xác nhận đã thu ${money(v.fineAmount)}?`} okText="Đã thu" cancelText="Không" onConfirm={() => act(() => api.violations.pay(v.id), "Đã ghi nhận nộp phạt")}>
                    <Button size="small" type="primary">
                      Thu tiền
                    </Button>
                  </Popconfirm>
                  <Popconfirm title="Miễn phạt cho vi phạm này?" okText="Miễn phạt" cancelText="Không" onConfirm={() => act(() => api.violations.waive(v.id), "Đã miễn phạt")}>
                    <Button size="small">Miễn phạt</Button>
                  </Popconfirm>
                </Space>
              ),
          },
        ]}
      />
      <Modal open={creating} title="Ghi nhận vi phạm" okText="Ghi nhận" cancelText="Hủy" width={640} onCancel={() => setCreating(false)} onOk={() => form.submit()}>
        <ReaderLookup value={reader} onChange={setReader} />
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ type: "OTHER", fineAmount: 0 }} style={{ marginTop: 16 }}>
          <Form.Item name="type" label="Loại">
            <Select options={options("violationType")} />
          </Form.Item>
          <Form.Item name="description" label="Nội dung" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="fineAmount" label="Tiền phạt (đ)">
            <InputNumber min={0} step={1000} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
