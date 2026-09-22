// Khung chung của mọi nhịp: thanh chấm tiến trình + nhãn nhịp + tiêu đề.
// Không có nút "quay lại chọn chủ đề" — phiên học chạy một mạch (C9).

export default function StepShell({ bar, kicker, title, children }) {
  return (
    <div className="screen">
      <div className="dots">
        {Array.from({ length: bar.total }, (_, i) => (
          <span key={i} className={`dot ${i < bar.index ? "dot-on" : i === bar.index ? "dot-now" : ""}`} />
        ))}
      </div>
      <div className="step-head">
        {kicker && <div className="step-kicker">{kicker}</div>}
        {title && <h1>{title}</h1>}
      </div>
      {children}
    </div>
  );
}
