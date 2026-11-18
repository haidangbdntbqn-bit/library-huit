import { Alert, Descriptions, Input, Space } from "antd";
import { useState } from "react";
import { api } from "../api";
import { errMsg } from "../api/client";
import type { Reader } from "../types";
import { fmtDate, money } from "../utils/format";
import CameraScan from "./CameraScan";
import StatusTag from "./StatusTag";

/** Tra cứu bạn đọc tại quầy theo MSSV hoặc số thẻ */
export default function ReaderLookup({
  value,
  onChange,
  defaultCode,
}: {
  value?: Reader | null;
  onChange: (r: Reader | null) => void;
  defaultCode?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const search = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(undefined);
    try {
      onChange(await api.readers.lookup(code.trim()));
    } catch (e) {
      onChange(null);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Input.Search
        placeholder="Quét thẻ hoặc nhập MSSV / số thẻ"
        enterButton="Tìm bạn đọc"
        defaultValue={defaultCode}
        loading={loading}
        onSearch={search}
        aria-label="Mã bạn đọc"
      />
      <CameraScan label="Quét thẻ sinh viên bằng camera" onResult={search} />
      {error && <Alert type="error" showIcon message={error} />}
      {value && (
        <Descriptions size="small" bordered column={2}>
          <Descriptions.Item label="Họ tên">{value.user?.fullName}</Descriptions.Item>
          <Descriptions.Item label="MSSV">{value.studentCode}</Descriptions.Item>
          <Descriptions.Item label="Ngành">{value.major?.name ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Lớp">{value.className ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="Thẻ thư viện">
            <StatusTag kind="card" value={value.card?.status ?? null} /> {value.card?.expiresAt && `HSD ${fmtDate(value.card.expiresAt)}`}
          </Descriptions.Item>
          <Descriptions.Item label="Tình trạng">
            <StatusTag kind="readerStatus" value={value.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Đang mượn">
            {value.activeLoans ?? 0}/{value.maxBooks} cuốn
          </Descriptions.Item>
          <Descriptions.Item label="Nợ phạt">
            {value.unpaidViolations ? <span style={{ color: "var(--c-danger)" }}>{value.unpaidViolations} vi phạm · {money(value.unpaidAmount)}</span> : "Không"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Space>
  );
}
