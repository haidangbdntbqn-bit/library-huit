import dotenv from "dotenv";
dotenv.config();

// Đặt múi giờ Việt Nam cho mọi phép tính ngày giờ (hạn trả, giờ mở cửa...)
process.env.TZ = process.env.TZ || "Asia/Ho_Chi_Minh";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} trong file .env`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  RASA_URL: process.env.RASA_URL || "http://localhost:5005",
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || "khoa-noi-bo-rasa",
  // Email nhắc hạn trả. Bỏ trống SMTP_HOST: hệ thống chỉ ghi log, không gửi thật
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "Thư viện HUIT <thuvien@example.edu.vn>",
  REMINDER_HOUR: Number(process.env.REMINDER_HOUR) || 7, // giờ gửi email nhắc hằng ngày
  WEB_URL: process.env.WEB_URL || "http://localhost:5173",
};
