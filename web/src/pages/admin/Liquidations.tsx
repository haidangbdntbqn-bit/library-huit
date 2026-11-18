import { App, Button, Form, Input, Modal, Select, Table } from "antd";
import { useState } from "react";
import { api, type LiquidationSlip } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import { usePaged } from "../../hooks/usePaged";
import { fmtDateTime } from "../../utils/format";

export default function Liquidations() {
  const { message } = App.useApp();
  const { tableProps, reload } = usePaged<LiquidationSlip>(api.liquidations.list);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<LiquidationSlip | null>(null);
  const [form] = Form.useForm();

  const create = async (v: { reason: string; barcodes: string[] }) => {
    try {
      const slip = await api.liquidations.create(v);
      message.success(`Đã lập phiếu thanh lý ${slip.code}`);
      setCreating(false);
      form.resetFields();
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Thanh lý sách"
        subtitle="Bản sách thanh lý không còn được mượn và không tính vào tổng kho"
        extra={
          <Button type="primary" danger onClick={() => setCreating(true)}>
            Lập phiếu thanh lý
          </Button>
        }
      />
      <Table<LiquidationSlip>
        {...tableProps}
        onRow={(r) => ({ onClick: async () => setDetail(await api.liquidations.get(r.id)), style: { cursor: "pointer" } })}
        columns={[
          { title: "Số phiếu", dataIndex: "code" },
          { title: "Ngày lập", render: (_, r) => fmtDateTime(r.createdAt) },
          { title: "Lý do", dataIndex: "reason" },
          { title: "Số bản", render: (_, r) => r._count?.copies },
          { title: "Người lập", render: (_, r) => r.staff.user.fullName },
        ]}
      />
      <Modal open={creating} title="Lập phiếu thanh lý" okText="Thanh lý" okButtonProps={{ danger: true }} cancelText="Hủy" width={640} onCancel={() => setCreating(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="barcodes" label="Mã vạch các bản cần thanh lý" rules={[{ required: true, message: "Nhập ít nhất 1 mã vạch" }]} extra="Quét hoặc gõ mã vạch rồi Enter, mỗi mã một thẻ">
            <Select mode="tags" tokenSeparators={[",", " ", "\n"]} open={false} placeholder="GT-CNTT-001-003" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, min: 3 }]}>
            <Input.TextArea rows={2} placeholder="Ví dụ: sách rách nát, giáo trình đã có phiên bản mới" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={!!detail} title={`Phiếu thanh lý ${detail?.code ?? ""}`} footer={null} onCancel={() => setDetail(null)} width={680}>
        <p>Lý do: {detail?.reason}</p>
        <Table
          rowKey="id"
          size="small"
          dataSource={detail?.copies ?? []}
          columns={[
            { title: "Mã vạch", dataIndex: "barcode" },
            { title: "Sách", render: (_, c) => c.book.title },
          ]}
        />
      </Modal>
    </>
  );
}
