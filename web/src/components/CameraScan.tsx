import { CameraOutlined } from "@ant-design/icons";
import { Alert, Button, Modal } from "antd";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector;
  }
}

/**
 * Quét mã vạch / QR bằng webcam máy tính (BarcodeDetector của trình duyệt Chrome, Edge).
 * Thủ thư không có máy quét vẫn quét được thẻ sinh viên và nhãn sách.
 */
export default function CameraScan({ onResult, label = "Quét bằng camera" }: { onResult: (value: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    setError("");
    if (!window.BarcodeDetector) {
      setError("Trình duyệt này chưa hỗ trợ quét mã vạch. Hãy dùng Chrome hoặc Edge, hoặc nhập mã bằng tay.");
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ["code_128", "qr_code", "ean_13", "code_39"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (!video.current || stopped) return;
        video.current.srcObject = s;
        await video.current.play();
        const loop = async () => {
          if (stopped || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            if (found[0]?.rawValue) {
              onResult(found[0].rawValue.trim());
              setOpen(false);
              return;
            }
          } catch {
            /* khung hình chưa sẵn sàng */
          }
          timer = window.setTimeout(loop, 250);
        };
        loop();
      })
      .catch(() => setError("Không mở được camera. Hãy cho phép trình duyệt dùng camera."));
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onResult]);

  return (
    <>
      <Button icon={<CameraOutlined />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} title="Đưa mã vạch vào khung hình" footer={null} onCancel={() => setOpen(false)} destroyOnClose>
        {error ? (
          <Alert type="warning" showIcon message={error} />
        ) : (
          <div style={{ position: "relative" }}>
            <video ref={video} muted playsInline style={{ width: "100%", borderRadius: 8, background: "#000" }} />
            <div style={{ position: "absolute", left: "10%", right: "10%", top: "40%", height: "20%", border: "2px solid #1B7A43", borderRadius: 6 }} />
          </div>
        )}
      </Modal>
    </>
  );
}
