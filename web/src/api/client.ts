import axios, { AxiosError } from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const TOKEN_KEY = "library_huit_token";

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    // Token hết hạn: xóa phiên và báo cho AuthProvider
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(err);
  },
);

/** Lấy thông báo lỗi tiếng Việt từ API */
export function errMsg(e: unknown): string {
  const ax = e as AxiosError<{ message?: string }>;
  if (ax?.response?.data?.message) return ax.response.data.message;
  if (ax?.message === "Network Error") return "Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.";
  return "Đã có lỗi xảy ra, vui lòng thử lại";
}

/** Bỏ các tham số rỗng trước khi gửi */
export function clean(params?: Record<string, unknown>) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

export const get = <T>(url: string, params?: Record<string, unknown>) =>
  http.get<T>(url, { params: clean(params) }).then((r) => r.data);
export const post = <T>(url: string, body?: unknown) => http.post<T>(url, body).then((r) => r.data);
export const patch = <T>(url: string, body?: unknown) => http.patch<T>(url, body ?? {}).then((r) => r.data);
export const put = <T>(url: string, body?: unknown) => http.put<T>(url, body).then((r) => r.data);
