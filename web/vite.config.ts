import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Web gọi API qua đường dẫn /api cùng địa chỉ, Vite chuyển tiếp sang backend cổng 5000.
// Nhờ vậy chỉ cần một link (localhost:5173 hoặc link Cloudflare) là chạy được cả web lẫn API.
const proxy = { "/api": { target: "http://localhost:5000", changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  // allowedHosts: cho phép truy cập qua tunnel (trycloudflare.com) khi demo từ xa
  server: { port: 5173, host: true, allowedHosts: true, proxy },
  preview: { port: 5173, host: true, allowedHosts: true, proxy },
});
