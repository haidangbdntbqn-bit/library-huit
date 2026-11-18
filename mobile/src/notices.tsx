import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { api, type Notice } from "./api";
import { colors } from "./ui";

const TONE: Record<Notice["level"], { bg: string; fg: string }> = {
  danger: { bg: "#FCE8E6", fg: colors.danger },
  warning: { bg: "#FDF3E1", fg: colors.warn },
  success: { bg: colors.bookedSoft, fg: colors.booked },
  info: { bg: colors.primarySoft, fg: colors.primary },
};

/**
 * Nhắc nhở cho bạn đọc: sách sắp đến hạn / quá hạn, sách đã soạn chờ nhận, tiền phạt, lịch phòng.
 * Tự tải lại mỗi khi mở màn hình.
 */
export function NoticeBanner({ only }: { only?: (n: Notice) => boolean }) {
  const [items, setItems] = useState<Notice[]>([]);
  useFocusEffect(
    useCallback(() => {
      api.notices().then(setItems).catch(() => setItems([]));
    }, []),
  );
  const list = only ? items.filter(only) : items;
  if (!list.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {list.map((n) => (
        <View key={n.key} style={{ backgroundColor: TONE[n.level].bg, borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: TONE[n.level].fg }}>
          <Text style={{ fontWeight: "700", color: TONE[n.level].fg }}>{n.title}</Text>
          <Text style={{ color: colors.text, marginTop: 2 }}>{n.message}</Text>
        </View>
      ))}
    </View>
  );
}
