/**
 * Mã vạch Code 128 (bộ ký tự B) vẽ bằng SVG, quét được bằng máy quét mã vạch
 * và camera điện thoại. Không cần thư viện ngoài.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const STOP = 106;

/** Chuỗi độ rộng các vạch (đen, trắng xen kẽ) cho giá trị ASCII 32–126 */
export function code128Widths(value: string): number[] {
  const codes = [...value].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) throw new Error("Code 128B chỉ hỗ trợ ký tự ASCII in được");
    return c - 32;
  });
  const checksum = codes.reduce((sum, c, i) => sum + c * (i + 1), START_B) % 103;
  return [START_B, ...codes, checksum, STOP].flatMap((c) => [...PATTERNS[c]].map(Number));
}

export default function Barcode128({
  value,
  height = 48,
  module = 1.6,
  showText = true,
  color = "#14213D",
}: {
  value: string;
  height?: number;
  module?: number;
  showText?: boolean;
  color?: string;
}) {
  const widths = code128Widths(value);
  const quiet = 10;
  let x = quiet;
  const bars: Array<{ x: number; w: number }> = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  const total = x + quiet;
  const textH = showText ? 14 : 0;
  return (
    <svg
      role="img"
      aria-label={`Mã vạch ${value}`}
      viewBox={`0 0 ${total} ${height + textH}`}
      width={total * module}
      height={(height + textH) * module * 0.6}
      preserveAspectRatio="none"
      style={{ background: "#fff", display: "block", maxWidth: "100%" }}
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={height} fill={color} />
      ))}
      {showText && (
        <text x={total / 2} y={height + 11} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={color}>
          {value}
        </text>
      )}
    </svg>
  );
}
