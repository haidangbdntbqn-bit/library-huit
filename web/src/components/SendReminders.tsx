import { MailOutlined } from "@ant-design/icons";
import { Alert, App, Button, Modal, Table, Tag } from "antd";
import { useState } from "react";
import { api } from "../api";
import { errMsg } from "../api/client";

type Result = Awaited<ReturnType<typeof api.notifications.sendReminders>>;

/** Nút gửi email nhắc hạn trả ngay (hệ thống cũng tự gửi mỗi sáng) */
export default function SendReminders() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const run = async () => {
    setLoading(true);
    try {
      setResult(await api.notifications.sendReminders());
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Button icon={<MailOutlined />} loading={loading} onClick={run}>
        Gửi email nhắc hạn trả
      </Button>
      <Modal open={!!result} title="Kết quả gửi email nhắc hạn trả" width={760} footer={null} onCancel={() => setResult(null)}>
        {result && (
          <>
            <Alert
              style={{ marginBottom: 12 }}
              type={result.smtp ? "success" : "info"}
              showIcon
              message={`${result.readers} bạn đọc có sách sắp đến hạn hoặc quá hạn.`}
              description={result.smtp ? "Email đã được gửi qua máy chủ SMTP." : "Chưa cấu hình SMTP trong backend/.env nên hệ thống chỉ ghi nhật ký, chưa gửi thật. Hệ thống tự chạy mỗi sáng; mỗi bạn đọc nhận tối đa 1 email/ngày."}
            />
            <Table
              size="small"
              rowKey={(r) => `${r.name}-${r.to}`}
              dataSource={result.emails}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: "Bạn đọc", dataIndex: "name" },
                { title: "Email", render: (_, r) => r.to ?? "—" },
                { title: "Tiêu đề", dataIndex: "subject" },
                { title: "Số cuốn", dataIndex: "items", align: "center" as const },
                { title: "Trạng thái", render: (_, r) => (r.skipped ? <Tag>{r.skipped}</Tag> : r.sent ? <Tag color="green">Đã gửi</Tag> : <Tag color="blue">Đã ghi log</Tag>) },
              ]}
            />
          </>
        )}
      </Modal>
    </>
  );
}
