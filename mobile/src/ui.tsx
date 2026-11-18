import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

export const colors = {
  primary: "#0B4DA2",
  primaryDark: "#08387A",
  primarySoft: "#EAF1FB",
  bg: "#F3F5F8",
  surface: "#FFFFFF",
  text: "#14213D",
  muted: "#4B5874",
  line: "#DCE3EC",
  warn: "#A15C07",
  danger: "#8C1D2F",
  booked: "#1F8A4C",
  bookedSoft: "#E3F3E8",
};

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Btn({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const bg = variant === "primary" ? colors.primary : "transparent";
  const fg = variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, borderColor: variant === "danger" ? colors.danger : colors.primary, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "500" }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, tone = "default" }: { text: string; tone?: "default" | "good" | "warn" | "bad" | "info" }) {
  const map = {
    // Nền đậm, chữ trắng: độ tương phản ≥ 4.5:1 (chuẩn WCAG AA)
    default: ["#E3E8F0", "#14213D"],
    good: ["#1B7A43", "#FFFFFF"],
    warn: ["#8A5300", "#FFFFFF"],
    bad: ["#B3261E", "#FFFFFF"],
    info: ["#0B4DA2", "#FFFFFF"],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={{ color: colors.muted, textAlign: "center", padding: 24 }}>{text}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  btn: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12 },
  btnText: { fontWeight: "600", fontSize: 15 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  badge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  h3: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { color: colors.muted },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
