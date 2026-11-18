import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // allowedHosts: cho phép truy cập qua tunnel (trycloudflare.com) khi demo từ xa
  server: { port: 5173, host: true, allowedHosts: true },
});
