import { useCallback, useEffect, useState } from "react";
import { App } from "antd";
import { errMsg } from "../api/client";
import type { Paged } from "../types";

type Params = Record<string, unknown> & { page: number; pageSize: number };

/** Tải danh sách có phân trang + bộ lọc, trả về props dùng thẳng cho antd Table */
export function usePaged<T extends { id: number }>(
  fetcher: (q: Record<string, unknown>) => Promise<Paged<T>>,
  initial: Record<string, unknown> = {},
  pageSize = 10,
) {
  const { message } = App.useApp();
  const [params, setParams] = useState<Params>({ page: 1, pageSize, ...initial });
  const [data, setData] = useState<Paged<T>>({ items: [], total: 0, page: 1, pageSize });
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(params);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetcher(JSON.parse(key)));
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setFilter = (patch: Record<string, unknown>) => setParams((p) => ({ ...p, ...patch, page: 1 }));

  const tableProps = {
    dataSource: data.items,
    loading,
    rowKey: "id" as const,
    pagination: {
      current: params.page,
      pageSize: params.pageSize,
      total: data.total,
      showSizeChanger: false,
      showTotal: (t: number) => `${t} dòng`,
      onChange: (page: number) => setParams((p) => ({ ...p, page })),
    },
  };

  return { data, params, setFilter, reload, loading, tableProps };
}

/** Tải dữ liệu đơn giản (không phân trang) */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const { message } = App.useApp();
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetcher());
    } catch (e) {
      message.error(errMsg(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, loading, reload, setData };
}
