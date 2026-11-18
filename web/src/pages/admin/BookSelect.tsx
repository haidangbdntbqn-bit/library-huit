import { Select, type SelectProps } from "antd";
import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Book } from "../../types";

/** Ô chọn đầu sách có tìm kiếm từ xa */
export default function BookSelect(props: SelectProps<number>) {
  const [books, setBooks] = useState<Book[]>([]);
  const search = (q: string) => api.books.list({ q, pageSize: 20 }).then((r) => setBooks(r.items));
  useEffect(() => {
    search("");
  }, []);
  return (
    <Select
      showSearch
      filterOption={false}
      placeholder="Tìm đầu sách"
      onSearch={search}
      options={books.map((b) => ({ value: b.id, label: `${b.code} · ${b.title}` }))}
      {...props}
    />
  );
}
