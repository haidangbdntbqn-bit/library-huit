import { App, Button, Input, Space, Table, Tabs } from "antd";
import { api } from "../../api";
import { errMsg } from "../../api/client";
import PageHeader from "../../components/PageHeader";
import StatusTag from "../../components/StatusTag";
import { usePaged } from "../../hooks/usePaged";
import type { LibraryCard } from "../../types";
import { fmtDate, label } from "../../utils/format";

export default function Cards() {
  const { message, modal } = App.useApp();
  const { tableProps, setFilter, reload, params } = usePaged<LibraryCard>(api.cards.list, { status: "ACTIVE" });

  const act = async (card: LibraryCard, action: "lock" | "unlock") => {
    const run = async (note?: string) => {
      try {
        await api.cards.action(card.id, action, note);
        message.success("Đã cập nhật thẻ");
        reload();
      } catch (e) {
        message.error(errMsg(e));
      }
    };
    if (action === "lock") {
      let note = "";
      modal.confirm({
        title: "Khóa thẻ thư viện",
        content: <Input.TextArea rows={2} placeholder="Lý do (bạn đọc sẽ thấy)" onChange={(e) => (note = e.target.value)} />,
        okText: "Khóa thẻ",
        okButtonProps: { danger: true },
        cancelText: "Hủy",
        onOk: () => run(note),
      });
    } else run();
  };

  return (
    <>
      <PageHeader
        title="Thẻ thư viện"
        subtitle="Thẻ sinh viên được dùng làm thẻ thư viện, tự kích hoạt khi tạo tài khoản và có hạn 6 năm kể từ năm nhập học. Thủ thư chỉ khóa hoặc mở khóa khi có vi phạm."
      />
      <Tabs
        activeKey={String(params.status ?? "")}
        onChange={(status) => setFilter({ status })}
        items={[
          { key: "ACTIVE", label: "Đang hoạt động" },
          { key: "LOCKED", label: "Đã khóa" },
          { key: "EXPIRED", label: "Hết hạn" },
          { key: "", label: "Tất cả" },
        ]}
      />
      <Input.Search placeholder="Số thẻ, MSSV, họ tên" allowClear style={{ width: 280, marginBottom: 16 }} onSearch={(q) => setFilter({ q })} />
      <Table<LibraryCard>
        {...tableProps}
        scroll={{ x: 900 }}
        columns={[
          { title: "MSSV", render: (_, c) => c.reader?.studentCode },
          { title: "Họ tên", render: (_, c) => c.reader?.user?.fullName },
          { title: "Đối tượng", render: (_, c) => label("readerType", c.reader?.readerType) },
          { title: "Ngành", render: (_, c) => c.reader?.major?.name ?? "—" },
          { title: "Số thẻ", render: (_, c) => c.cardNumber ?? "—" },
          { title: "Ngày kích hoạt", render: (_, c) => fmtDate(c.issuedAt) },
          { title: "Hạn thẻ", render: (_, c) => fmtDate(c.expiresAt) },
          { title: "Trạng thái", render: (_, c) => <StatusTag kind="card" value={c.status} /> },
          {
            title: "",
            render: (_, c) => (
              <Space>
                {c.status === "ACTIVE" && (
                  <Button size="small" danger onClick={() => act(c, "lock")}>
                    Khóa
                  </Button>
                )}
                {c.status === "LOCKED" && (
                  <Button size="small" onClick={() => act(c, "unlock")}>
                    Mở khóa
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
