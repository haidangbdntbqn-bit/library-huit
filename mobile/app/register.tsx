import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api, errMsg, type Major } from "../src/api";
import { useAuth } from "../src/auth";
import { Btn, Chip, colors, s } from "../src/ui";

const FIELDS: Array<{ key: string; label: string; secure?: boolean; keyboard?: "email-address" | "phone-pad" | "number-pad" }> = [
  { key: "fullName", label: "Họ và tên" },
  { key: "studentCode", label: "MSSV", keyboard: "number-pad" },
  { key: "className", label: "Lớp" },
  { key: "email", label: "Email", keyboard: "email-address" },
  { key: "phone", label: "Số điện thoại", keyboard: "phone-pad" },
  { key: "username", label: "Tên đăng nhập" },
  { key: "password", label: "Mật khẩu (tối thiểu 6 ký tự)", secure: true },
];

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [majorId, setMajorId] = useState<number>();
  const [majors, setMajors] = useState<Major[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.majors().then(setMajors).catch(() => undefined);
  }, []);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => String(v ?? "").trim() !== ""));
      await register({ ...body, majorId, readerType: "STUDENT" });
      router.replace("/(tabs)/account");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {FIELDS.map((f) => (
        <View key={f.key}>
          <Text style={s.label}>{f.label}</Text>
          <TextInput
            style={s.input}
            secureTextEntry={f.secure}
            autoCapitalize={f.key === "fullName" || f.key === "className" ? "words" : "none"}
            keyboardType={f.keyboard}
            value={form[f.key] ?? ""}
            onChangeText={(v) => setForm((x) => ({ ...x, [f.key]: v }))}
          />
        </View>
      ))}
      <Text style={s.label}>Ngành</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {majors.map((m) => (
          <Chip key={m.id} label={m.name} active={majorId === m.id} onPress={() => setMajorId(m.id)} />
        ))}
      </View>
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Btn title="Tạo tài khoản" onPress={submit} loading={loading} />
    </ScrollView>
  );
}
