// Vòng tiến độ: số ngày to ở giữa, cung chạy theo số mẫu câu đã nắm trên tổng 72.
// SVG thuần, không thư viện, không asset ngoài (C8).
//
// Cung dùng dải chuyển (defs bên dưới) và tự vẽ khi vào màn — biến `--c` truyền chu vi cho
// keyframes `draw` trong styles.css, nên animation luôn khớp bán kính thật.

export default function Ring({ value, total, label, sub }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;

  return (
    <div className="ring">
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--lime)" />
            <stop offset="100%" stopColor="var(--mint)" />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="52" cy="52" r={R} fill="none" strokeWidth="6" />
        <circle
          className="ring-fill"
          cx="52"
          cy="52"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ "--c": C }}
        />
      </svg>
      <div className="ring-mid">
        <span className="ring-num">{label}</span>
        <span className="ring-lab">{sub}</span>
      </div>
    </div>
  );
}
