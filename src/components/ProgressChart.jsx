// Biểu đồ tiến độ 14 ngày (trang chủ): 2 panel chung trục ngày — TỪ VỰNG (cột chồng: mới + ôn lại)
// và PHÚT NÓI (cột đơn). SVG thuần, không lib; hai thước đo khác đơn vị → hai panel, KHÔNG dual-axis.
// Dữ liệu: srs/daily.js (lastNDays). Thuần UI — không business logic.
import { useMemo } from "react";
import { loadDaily, lastNDays } from "../srs/daily.js";

const DAYS = 14;
// Màu series đã validate (CVD ΔE 65 / contrast ≥3:1 trên nền tối #1a1d24) — KHÔNG dùng cho text.
const C_NEW = "#0fa377", C_REV = "#4a8ee8", C_SPK = "#bd8404";
const W = 336, PAD_L = 24, PAD_R = 6, PLOT_H = 64;
const BAND = (W - PAD_L - PAD_R) / DAYS;
const BAR = Math.min(16, Math.floor(BAND) - 5);

// Trần trục "đẹp" (5/10/20/50…) để tick tròn số.
function niceMax(v) {
  if (v <= 5) return 5;
  if (v <= 50) return Math.ceil(v / 5) * 5; // dải nhỏ: bội số 5 sát dữ liệu (25→25, không nhảy 50)
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

// Cột đầu tròn 4px (data-end), vuông ở baseline (theo mark spec).
function topRoundedRect(x, y, w, h, r) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

// 1 panel: title + cột theo ngày. segs(d) = các tầng [ {v, color} ] từ ĐÁY lên (đã trừ chồng lấp).
function Panel({ days, segs, unit, axisTop, xLabels }) {
  const H = PLOT_H + (xLabels ? 16 : 4);
  const scale = (v) => (v / axisTop) * (PLOT_H - 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
      {/* lưới hairline: đỉnh trục + baseline */}
      <line x1={PAD_L} y1={PLOT_H - (PLOT_H - 10)} x2={W - PAD_R} y2={PLOT_H - (PLOT_H - 10)} stroke="var(--border)" strokeWidth="1" />
      <line x1={PAD_L} y1={PLOT_H} x2={W - PAD_R} y2={PLOT_H} stroke="var(--border2)" strokeWidth="1" />
      <text x={PAD_L - 4} y={PLOT_H - (PLOT_H - 10) + 3} textAnchor="end" fontSize="9" fill="var(--text3)">{axisTop}</text>
      <text x={PAD_L - 4} y={PLOT_H + 3} textAnchor="end" fontSize="9" fill="var(--text3)">0</text>
      {days.map((d, i) => {
        const x = PAD_L + i * BAND + (BAND - BAR) / 2;
        const parts = segs(d).filter((s) => s.v > 0);
        const total = parts.reduce((a, s) => a + s.v, 0);
        let y = PLOT_H;
        return (
          <g key={d.day}>
            <title>{`${new Date(d.day).getDate()}/${new Date(d.day).getMonth() + 1}: ${segs(d).map((s) => `${s.v} ${s.name}`).join(" · ")}`}</title>
            {parts.map((s, j) => {
              const h = Math.max(scale(s.v), 2);
              y -= h;
              const isTop = j === parts.length - 1;
              const el = isTop
                ? <path key={s.name} d={topRoundedRect(x, y, BAR, h, 3)} fill={s.color} />
                : <rect key={s.name} x={x} y={y} width={BAR} height={h} fill={s.color} />;
              y -= 2; // khe 2px màu nền giữa các tầng
              return el;
            })}
            {/* nhãn chọn lọc: chỉ HÔM NAY, bằng text token (không mặc màu series) */}
            {i === days.length - 1 && total > 0 && (
              <text x={x + BAR / 2} y={y - 2} textAnchor="middle" fontSize="9" fill="var(--text2)">{total}{unit}</text>
            )}
            {xLabels && i % 2 === 1 && (
              <text x={PAD_L + i * BAND + BAND / 2} y={PLOT_H + 13} textAnchor="middle" fontSize="9" fill="var(--text3)">
                {new Date(d.day).getDate()}/{new Date(d.day).getMonth() + 1}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ProgressChart() {
  const days = useMemo(() => lastNDays(loadDaily(), DAYS, Date.now()), []);
  const empty = days.every((d) => !d.rev && !d.spkMin);
  if (empty) {
    return <p className="app-sub" style={{ marginBottom: 10 }}>Chưa có dữ liệu — học từ hoặc luyện nói xong sẽ thấy biểu đồ ở đây.</p>;
  }
  const vocabTop = niceMax(Math.max(...days.map((d) => d.rev)));
  const spkTop = niceMax(Math.max(...days.map((d) => d.spkMin)));
  return (
    <div className="pchart">
      <div className="pchart-head">
        <span className="pchart-t">Từ vựng / ngày</span>
        <span className="pchart-leg"><i style={{ background: C_NEW }} /> mới <i style={{ background: C_REV }} /> ôn lại</span>
      </div>
      <Panel days={days} axisTop={vocabTop} unit="" xLabels={false}
        segs={(d) => [{ v: Math.max(d.rev - d.nw, 0), color: C_REV, name: "ôn" }, { v: d.nw, color: C_NEW, name: "mới" }]} />
      <div className="pchart-head" style={{ marginTop: 6 }}>
        <span className="pchart-t">Phút nói / ngày</span>
      </div>
      <Panel days={days} axisTop={spkTop} unit="′" xLabels
        segs={(d) => [{ v: d.spkMin, color: C_SPK, name: "phút" }]} />
    </div>
  );
}
