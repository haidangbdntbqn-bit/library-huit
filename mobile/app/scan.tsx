import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { api, errMsg } from "../src/api";
import { Btn, colors, s } from "../src/ui";

/**
 * Quét mã vạch dán trên sách (VD GT-CNTT-001-002) hoặc mã sách bằng camera điện thoại
 * để mở ngay trang chi tiết: còn bản không, kệ nào, đặt mượn.
 */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState("Đưa mã vạch trên nhãn sách vào khung");
  const busy = useRef(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (busy.current) return;
    busy.current = true;
    setMessage(`Đang tra mã ${data}…`);
    try {
      const r = await api.bookByBarcode(data.trim());
      router.replace(`/book/${r.bookId}`);
    } catch (e) {
      setMessage(`${errMsg(e)}. Thử quét lại.`);
      setTimeout(() => (busy.current = false), 1500);
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  if (!permission.granted) {
    return (
      <View style={[s.content, { flex: 1, justifyContent: "center", gap: 16 }]}>
        <Text style={s.h3}>Cần quyền dùng camera</Text>
        <Text style={s.muted}>Ứng dụng dùng camera để quét mã vạch trên sách, không lưu lại hình ảnh.</Text>
        <Btn title="Cho phép dùng camera" onPress={requestPermission} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["code128", "code39", "qr", "ean13"] }}
        onBarcodeScanned={onScanned}
      />
      <View pointerEvents="none" style={{ position: "absolute", left: "10%", right: "10%", top: "38%", height: "18%", borderWidth: 3, borderColor: colors.booked, borderRadius: 12 }} />
      <View style={{ position: "absolute", left: 16, right: 16, bottom: 40, backgroundColor: "rgba(20,33,61,0.85)", borderRadius: 12, padding: 14 }}>
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>{message}</Text>
      </View>
    </View>
  );
}
