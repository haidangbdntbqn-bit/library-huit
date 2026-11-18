import { App, Button, Col, Form, Input, InputNumber, Modal, Row, Select, Table, Tabs } from "antd";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import { clearMajorCache } from "../../components/MajorSelect";
import PageHeader from "../../components/PageHeader";
import { useLoad } from "../../hooks/usePaged";
import type { Faculty, Major } from "../../types";

function Rules() {
  const { message } = App.useApp();
  const { data } = useLoad(() => api.settings.get());
  const [form] = Form.useForm();
  useEffect(() => {
    if (data) form.setFieldsValue(data.values);
  }, [data, form]);

  const save = async (v: Record<string, number>) => {
    try {
      await api.settings.update(v);
      message.success("Đã lưu quy định");
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  if (!data) return null;
  return (
    <div className="panel" style={{ maxWidth: 820 }}>
      <p className="muted" style={{ marginTop: 0 }}>
        Các giá trị mặc định chỉ để chạy thử. Hãy cập nhật theo quy định thực tế của thư viện.
      </p>
      <Form form={form} layout="vertical" onFinish={save}>
        <Row gutter={16}>
          {Object.entries(data.labels).map(([key, text]) => (
            <Col key={key} xs={24} md={12}>
              <Form.Item name={key} label={text} rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          ))}
        </Row>
        <Button type="primary" htmlType="submit">
          Lưu quy định
        </Button>
      </Form>
    </div>
  );
}

/** Danh mục khoa và tỉ lệ hoa hồng bán sách, tài liệu */
function Faculties() {
  const { message } = App.useApp();
  const { data, loading, reload } = useLoad(() => api.faculties.list());
  const [editing, setEditing] = useState<Faculty | "new" | null>(null);
  const [form] = Form.useForm();

  const open = (f: Faculty | "new") => {
    setEditing(f);
    form.resetFields();
    form.setFieldsValue(f === "new" ? { commissionRate: 5 } : { ...f, commissionRate: Number(f.commissionRate) });
  };
  const save = async (v: Record<string, unknown>) => {
    try {
      if (editing === "new") await api.faculties.create(v);
      else if (editing) await api.faculties.update(editing.id, v);
      message.success("Đã lưu khoa");
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <p className="muted" style={{ maxWidth: 760 }}>
        Doanh thu bán giáo trình, sách tham khảo và tài liệu bài giảng được tổng hợp theo khoa của ngành; tiền hoa hồng chia cho khoa = doanh thu × tỉ lệ dưới đây
        (xem ở Báo cáo thống kê).
      </p>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => open("new")}>
        Thêm khoa
      </Button>
      <Table<Faculty>
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        pagination={false}
        style={{ maxWidth: 900 }}
        columns={[
          { title: "Mã khoa", dataIndex: "code" },
          { title: "Tên khoa", dataIndex: "name" },
          { title: "Ngành trực thuộc", render: (_, f) => (f.majors ?? []).map((m) => m.name).join(", ") || "—" },
          { title: "Hoa hồng", align: "right" as const, render: (_, f) => `${Number(f.commissionRate)}%` },
          { title: "", render: (_, f) => <Button size="small" onClick={() => open(f)}>Sửa</Button> },
        ]}
      />
      <Modal open={editing !== null} title={editing === "new" ? "Thêm khoa" : "Sửa khoa"} okText="Lưu" cancelText="Hủy" onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="code" label="Mã khoa" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên khoa" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="commissionRate" label="Tỉ lệ hoa hồng (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} step={0.5} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function Majors() {
  const { message } = App.useApp();
  const { data, loading, reload } = useLoad(() => api.majors.list());
  const faculties = useLoad(() => api.faculties.list());
  const [editing, setEditing] = useState<Major | "new" | null>(null);
  const [form] = Form.useForm();

  const open = (m: Major | "new") => {
    setEditing(m);
    form.resetFields();
    if (m !== "new") form.setFieldsValue(m);
  };

  const save = async (v: Record<string, unknown>) => {
    try {
      if (editing === "new") await api.majors.create(v);
      else if (editing) await api.majors.update(editing.id, v);
      clearMajorCache();
      message.success("Đã lưu ngành");
      setEditing(null);
      reload();
    } catch (e) {
      message.error(errMsg(e));
    }
  };

  return (
    <>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => open("new")}>
        Thêm ngành
      </Button>
      <Table<Major>
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        pagination={false}
        style={{ maxWidth: 720 }}
        columns={[
          { title: "Mã ngành", dataIndex: "code" },
          { title: "Tên ngành", dataIndex: "name" },
          { title: "Thuộc khoa", render: (_, m) => m.faculty?.name ?? "—" },
          { title: "", render: (_, m) => <Button size="small" onClick={() => open(m)}>Sửa</Button> },
        ]}
      />
      <Modal open={editing !== null} title={editing === "new" ? "Thêm ngành" : "Sửa ngành"} okText="Lưu" cancelText="Hủy" onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="code" label="Mã ngành" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên ngành" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="facultyId" label="Thuộc khoa">
            <Select allowClear options={(faculties.data ?? []).map((f) => ({ value: f.id, label: f.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt & danh mục" subtitle="Quy định mượn trả, tiền phạt, giờ mở cửa và danh mục ngành học" />
      <Tabs
        items={[
          { key: "rules", label: "Quy định nghiệp vụ", children: <Rules /> },
          { key: "faculties", label: "Khoa và hoa hồng", children: <Faculties /> },
          { key: "majors", label: "Ngành học", children: <Majors /> },
        ]}
      />
    </>
  );
}
