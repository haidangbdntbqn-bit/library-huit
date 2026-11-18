import { App, Button, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Switch, Table, Tabs } from "antd";
import { useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import MajorSelect from "../../components/MajorSelect";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import type { Material, Order } from "../../types";
import { fmtDateTime, label, money, options } from "../../utils/format";

function Orders() {
  const { message } = App.useApp();
  const { tableProps, setFilter, reload } = usePaged<Order>(api.orders.list, { status: "PENDING" });

  const act = async (o: Order, action: "pay" | "complete" | "cancel", ok: string) => {
    try {
      await api.orders.action(o.id, action);
      message.success(ok);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="Trạng thái" defaultValue="PENDING" style={{ width: 200 }} options={options("order")} onChange={(status) => setFilter({ status })} />
        <Input.Search placeholder="Mã đơn, MSSV, họ tên" allowClear style={{ width: 260 }} onSearch={(q) => setFilter({ q })} />
      </Space>
      <Table<Order>
        {...tableProps}
        scroll={{ x: 1000 }}
        columns={[
          { title: "Mã đơn", dataIndex: "code" },
          { title: "Ngày đặt", render: (_, o) => fmtDateTime(o.createdAt) },
          { title: "Bạn đọc", render: (_, o) => `${o.reader?.user.fullName} (${o.reader?.studentCode})` },
          { title: "Tài liệu", render: (_, o) => o.items.map((i) => `${i.material.title} ×${i.quantity}`).join(", ") },
          { title: "Tổng tiền", render: (_, o) => money(o.totalAmount) },
          { title: "Thanh toán", render: (_, o) => label("payment", o.paymentMethod) },
          { title: "Trạng thái", render: (_, o) => <StatusTag kind="order" value={o.status} /> },
          {
            title: "",
            render: (_, o) => (
              <Space>
                {o.status === "PENDING" && (
                  <>
                    <Popconfirm title={`Xác nhận đã nhận ${money(o.totalAmount)}?`} okText="Đã thu tiền" cancelText="Không" onConfirm={() => act(o, "pay", "Đã xác nhận thanh toán")}>
                      <Button size="small" type="primary">
                        Đã thanh toán
                      </Button>
                    </Popconfirm>
                    <Popconfirm title="Hủy đơn và hoàn lại tồn kho?" okText="Hủy đơn" cancelText="Không" onConfirm={() => act(o, "cancel", "Đã hủy đơn")}>
                      <Button size="small" danger>
                        Hủy
                      </Button>
                    </Popconfirm>
                  </>
                )}
                {o.status === "PAID" && (
                  <Button size="small" onClick={() => act(o, "complete", "Đã giao tài liệu")}>
                    Đã giao tài liệu
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}

function Materials() {
  const { message } = App.useApp();
  const { tableProps, setFilter, reload } = usePaged<Material>(api.materials.list, { all: true });
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  const [form] = Form.useForm();

  const open = (m: Material | "new") => {
    setEditing(m);
    form.resetFields();
    if (m !== "new") form.setFieldsValue({ ...m, price: Number(m.price) });
  };

  const save = async (v: Record<string, unknown>) => {
    try {
      if (editing === "new") await api.materials.create(v);
      else if (editing) await api.materials.update(editing.id, v);
      message.success("Đã lưu tài liệu");
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => open("new")}>
          Thêm sách / tài liệu
        </Button>
        <Select allowClear placeholder="Loại" style={{ width: 200 }} options={options("category")} onChange={(category) => setFilter({ category })} />
        <Input.Search placeholder="Tên, mã, tác giả, giảng viên" allowClear style={{ width: 260 }} onSearch={(q) => setFilter({ q })} />
      </Space>
      <Table<Material>
        {...tableProps}
        scroll={{ x: 900 }}
        columns={[
          { title: "Mã", dataIndex: "code" },
          { title: "Tên sách / tài liệu", dataIndex: "title" },
          { title: "Loại", render: (_, m) => <StatusTag kind="category" value={m.category} /> },
          { title: "Khoa", render: (_, m) => m.major?.faculty?.name ?? "Dùng chung" },
          { title: "Tác giả / giảng viên", dataIndex: "lecturer" },
          { title: "Định dạng", render: (_, m) => label("format", m.format) },
          { title: "Giá bán", render: (_, m) => money(m.price) },
          { title: "Tồn kho", render: (_, m) => (m.format === "DIGITAL" ? "—" : m.stock) },
          { title: "Đang bán", render: (_, m) => (m.isActive ? "Có" : "Ngừng bán") },
          { title: "", render: (_, m) => <Button size="small" onClick={() => open(m)}>Sửa</Button> },
        ]}
      />
      <Modal open={editing !== null} title={editing === "new" ? "Thêm tài liệu bài giảng" : "Sửa tài liệu"} okText="Lưu" cancelText="Hủy" width={640} onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ category: "BAI_GIANG", format: "PRINT", stock: 0, isActive: true }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="Mã" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="title" label="Tên tài liệu" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lecturer" label="Tác giả / giảng viên">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="majorId" label="Ngành">
                <MajorSelect />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="format" label="Định dạng">
                <Select options={options("format")} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="Loại">
                <Select options={options("category")} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="price" label="Giá bán (đ)" rules={[{ required: true }]}>
                <InputNumber min={0} step={1000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stock" label="Tồn kho">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Mô tả">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="isActive" label="Đang bán" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

export default function Store() {
  return (
    <>
      <PageHeader title="Nhà sách thư viện" subtitle="Bán giáo trình, sách tham khảo, tài liệu bài giảng: xác nhận thanh toán, giao sách và quản lý danh mục. Hoa hồng theo khoa xem ở Báo cáo thống kê." />
      <Tabs
        items={[
          { key: "orders", label: "Đơn hàng", children: <Orders /> },
          { key: "materials", label: "Danh mục sách, tài liệu", children: <Materials /> },
        ]}
      />
    </>
  );
}
