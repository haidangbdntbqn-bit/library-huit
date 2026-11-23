import type { CSSProperties } from "react";

/** Màu chủ đạo theo ngành (mã ngành trong hệ thống) */
const MAJOR_COLORS: Record<string, string> = {
  CNTT: "#0B4DA2", ATTT: "#1E3A5F", KT: "#7C2D12", QTKD: "#5B21B6", MKT: "#A21C55", TCNH: "#166534",
  CNTP: "#A14A0B", ATTP: "#0F766E", CNSH: "#3F6212", CNHH: "#9F1239", DLLH: "#B4441A", NNA: "#334155",
};
const FALLBACK = ["#1E3A5F", "#7C2D12", "#365314", "#4C1D95", "#0B4DA2", "#8A6A2E", "#9F1239", "#334155"];
const ACCENTS = ["#F2C14E", "#F28C6B", "#8FD3C8", "#C9B6FF", "#F7D9A8"];

export function hashOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Họa tiết trang trí, chọn theo mã sách để mỗi cuốn một kiểu */
function Motif({ variant, color }: { variant: number; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 2 } as const;
  switch (variant % 4) {
    case 0: // vòng tròn đồng tâm
      return (
        <svg viewBox="0 0 100 100" className="gc-motif" aria-hidden>
          {[14, 26, 38, 50].map((r) => <circle key={r} cx="60" cy="40" r={r} {...common} />)}
        </svg>
      );
    case 1: // sọc chéo
      return (
        <svg viewBox="0 0 100 100" className="gc-motif" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1={i * 14 - 30} y1="100" x2={i * 14 + 40} y2="0" {...common} />)}
        </svg>
      );
    case 2: // lưới chấm
      return (
        <svg viewBox="0 0 100 100" className="gc-motif" aria-hidden>
          {Array.from({ length: 36 }, (_, i) => <circle key={i} cx={10 + (i % 6) * 16} cy={10 + Math.floor(i / 6) * 16} r="2.6" fill={color} />)}
        </svg>
      );
    default: // khối vuông chồng lớp
      return (
        <svg viewBox="0 0 100 100" className="gc-motif" aria-hidden>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={20 + i * 9} y={8 + i * 9} width="52" height="52" transform={`rotate(${12 * i} 46 34)`} {...common} />)}
        </svg>
      );
  }
}

export interface CoverInfo {
  seed: string; // mã sách / mã tài liệu
  kind: string; // Giáo trình, Tài liệu tham khảo, Bài giảng...
  title: string;
  author?: string | null;
  majorCode?: string | null;
  majorName?: string | null;
  footnote?: string | null; // NXB · năm
  light?: boolean; // nền sáng (tài liệu tham khảo)
}

/** Bìa sách tự sinh từ dữ liệu: đúng tên, tác giả, ngành, NXB của từng cuốn */
export default function GeneratedCover({ info, width, style }: { info: CoverInfo; width?: number | string; style?: CSSProperties }) {
  const h = hashOf(info.seed);
  const main = (info.majorCode && MAJOR_COLORS[info.majorCode]) || FALLBACK[h % FALLBACK.length];
  const accent = ACCENTS[h % ACCENTS.length];
  const bg = info.light ? "#F5F0E6" : main;
  const fg = info.light ? main : "#FFFFFF";
  return (
    <div
      className="gcover"
      role="img"
      aria-label={`Bìa ${info.kind.toLowerCase()} ${info.title}`}
      style={{ width, background: info.light ? bg : `linear-gradient(160deg, ${main} 0%, ${main} 55%, ${shade(main)} 100%)`, color: fg, ...style }}
    >
      <Motif variant={h >> 3} color={info.light ? main : "#FFFFFF"} />
      <div className="gc-body">
        <span className="gc-bar" style={{ background: info.light ? main : accent }} />
        <span className="gc-kind">{info.kind}</span>
        <span className="gc-title">{info.title}</span>
        {info.author && <span className="gc-author">{info.author}</span>}
      </div>
      <div className="gc-foot" style={{ background: info.light ? main : "#FBF7EF", color: info.light ? "#FFFFFF" : main }}>
        {info.majorName && <span className="gc-major">{info.majorName}</span>}
        {info.footnote && <span className="gc-note">{info.footnote}</span>}
      </div>
    </div>
  );
}

/** Màu tối hơn một chút cho chuyển màu nền */
function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * 0.72));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
