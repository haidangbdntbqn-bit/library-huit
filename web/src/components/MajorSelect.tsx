import { Select, type SelectProps } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api";
import type { Major } from "../types";

let cache: Major[] | null = null;

/** Ô chọn ngành học (tự tải danh mục ngành) */
export default function MajorSelect(props: SelectProps<number>) {
  const [majors, setMajors] = useState<Major[]>(cache ?? []);
  useEffect(() => {
    if (!cache) api.majors.list().then((m) => setMajors((cache = m)));
  }, []);
  return (
    <Select
      allowClear
      placeholder="Chọn ngành"
      showSearch
      optionFilterProp="label"
      options={majors.map((m) => ({ value: m.id, label: m.name }))}
      {...props}
    />
  );
}

export function clearMajorCache() {
  cache = null;
}
