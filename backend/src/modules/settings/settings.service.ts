import { prisma } from "../../config/prisma";

/**
 * Quy định nghiệp vụ của thư viện. Giá trị mặc định chỉ để chạy thử,
 * nhóm cần chỉnh lại theo quy định thực tế sau khi khảo sát (trang Cài đặt).
 */
export const DEFAULT_SETTINGS = {
  LOAN_DAYS: 14,
  MAX_RENEWALS: 1,
  RENEW_DAYS: 3,
  FINE_PER_DAY: 2000,
  DAMAGE_FINE: 50000,
  LOST_FINE: 200000,
  ROOM_DAMAGE_FINE: 100000,
  ROOM_LOST_FINE: 300000,
  CARD_VALID_DAYS: 2190,
  PICKUP_DAYS: 2,
  OPEN_HOUR: 7,
  CLOSE_HOUR: 20,
  REMIND_DAYS: 3,
  BLOCK_IF_UNPAID: 1,
  AUTO_APPROVE_BOOKING: 0,
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export const SETTING_LABELS: Record<SettingKey, string> = {
  LOAN_DAYS: "Số ngày mượn về nhà",
  MAX_RENEWALS: "Số lần gia hạn tối đa",
  RENEW_DAYS: "Số ngày mỗi lần gia hạn",
  FINE_PER_DAY: "Tiền phạt trả trễ mỗi ngày (đ)",
  DAMAGE_FINE: "Tiền phạt làm hỏng sách (đ)",
  LOST_FINE: "Tiền phạt làm mất sách (đ)",
  ROOM_DAMAGE_FINE: "Tiền phạt gợi ý khi làm hỏng đồ đạc trong phòng (đ)",
  ROOM_LOST_FINE: "Tiền phạt gợi ý khi làm mất đồ đạc trong phòng (đ)",
  CARD_VALID_DAYS: "Thời hạn thẻ thư viện tính từ ngày nhập học (ngày, 6 năm = 2190)",
  PICKUP_DAYS: "Số ngày giữ sách chờ nhận",
  OPEN_HOUR: "Giờ mở cửa thư viện",
  CLOSE_HOUR: "Giờ đóng cửa thư viện",
  REMIND_DAYS: "Nhắc bạn đọc trước hạn trả (ngày)",
  BLOCK_IF_UNPAID: "Chặn mượn khi còn nợ phạt (1 = có, 0 = không)",
  AUTO_APPROVE_BOOKING: "Tự động duyệt đặt phòng (1 = có, 0 = không)",
};

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in result) {
      const n = Number(row.value);
      if (!Number.isNaN(n)) result[row.key as SettingKey] = n;
    }
  }
  return result;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const keys = Object.keys(patch).filter((k) => k in DEFAULT_SETTINGS) as SettingKey[];
  await prisma.$transaction(
    keys.map((key) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(patch[key]) },
        create: { key, value: String(patch[key]) },
      }),
    ),
  );
  return getSettings();
}
