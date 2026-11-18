import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkServer, errMsg, getApiUrl, resetApiUrl, setApiUrl } from "../src/api";
import { useAuth } from "../src/auth";
import { Btn, colors, s } from "../src/ui";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Cài đặt máy chủ: cần khi cài bản APK, vì IP máy chạy backend thay đổi theo mạng Wi-Fi
  const [showServer, setShowServer] = useState(false);
  const [server, setServer] = useState("");
  const [serverMsg, setServerMsg] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    getApiUrl().then(setServer);
  }, []);
  const saveServer = async () => {
    setChecking(true);
    setServerMsg("");
    const url = await setApiUrl(server);
    setServer(url);
    const ok = await checkServer(url);
    setServerMsg(ok ? "Kết nối máy chủ thành công" : "Không kết nối được. Kiểm tra IP, backend đang chạy và cùng Wi-Fi.");
    setChecking(false);
  };

  const submit = async () => {
    if (!username || !password) return setError("Nhập tên đăng nhập và mật khẩu");
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: 24, gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primary, marginBottom: 8 }} />
        <Text style={{ fontSize: 28, fontWeight: "700", color: colors.text }}>Thư viện HUIT</Text>
        <Text style={s.muted}>Đăng nhập bằng tài khoản bạn đọc</Text>
        <View>
          <Text style={s.label}>Tên đăng nhập</Text>
          <TextInput style={s.input} autoCapitalize="none" value={username} onChangeText={setUsername} />
        </View>
        <View>
          <Text style={s.label}>Mật khẩu</Text>
          <TextInput style={s.input} secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        </View>
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <Btn title="Đăng nhập" onPress={submit} loading={loading} />
        <Pressable onPress={() => setShowServer((v) => !v)}>
          <Text style={[s.muted, { textAlign: "center", fontSize: 13 }]}>{showServer ? "Ẩn cài đặt máy chủ" : "Cài đặt máy chủ"}</Text>
        </Pressable>
        {showServer && (
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Địa chỉ máy chủ (IP máy chạy backend)</Text>
            <TextInput style={s.input} autoCapitalize="none" autoCorrect={false} keyboardType="url" value={server} onChangeText={setServer} placeholder="192.168.1.23" />
            <Btn title="Lưu và kiểm tra kết nối" onPress={saveServer} loading={checking} />
            <Pressable onPress={async () => { setServer(await resetApiUrl()); setServerMsg("Đã dùng địa chỉ mặc định"); }}>
              <Text style={[s.muted, { textAlign: "center", fontSize: 13 }]}>Dùng địa chỉ mặc định</Text>
            </Pressable>
            {!!serverMsg && <Text style={{ color: serverMsg.startsWith("Kết nối") ? colors.primary : colors.danger, textAlign: "center" }}>{serverMsg}</Text>}
          </View>
        )}
        <Text style={[s.muted, { textAlign: "center" }]}>
          Chưa có tài khoản?{" "}
          <Link href="/register" style={{ color: colors.primary, fontWeight: "600" }}>
            Đăng ký
          </Link>
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
