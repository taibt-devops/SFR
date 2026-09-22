// Màn đóng ngày (spec §4.1) — một màn, không cuộn, kết thúc dứt khoát.
// App KHÔNG mời học thêm sau khi bấm "Xong hôm nay": kết thúc rõ ràng khiến lần sau mở ra nhẹ đầu.
// Phần mở rộng là phần thưởng cho ngày khoẻ, không phải món nợ cho ngày mệt (C12).
//
// Đây là khoảnh khắc trả công duy nhất trong ngày nên nó được phép "to tiếng": dấu tick đóng như
// con dấu, mẫu câu hiện cỡ lớn, chuỗi ngày nhảy số. Mọi màn khác vẫn phải trầm.

export default function DayDone({ lesson, streak, saidBest, extDone, canExt, onExt, onExit }) {
  return (
    <div className="screen screen-mid">
      <div className="done-mark">✓</div>

      {lesson?.review ? (
        <div className="reveal" style={{ "--d": "180ms" }}>
          <div className="eyebrow">Chốt tuần {lesson.week}</div>
          <h1 className="t-hero-title" style={{ marginTop: 8 }}>Xong tuần này</h1>
        </div>
      ) : (
        <div className="reveal" style={{ "--d": "180ms" }}>
          <div className="eyebrow">1% hôm nay</div>
          <div className="pattern" style={{ marginTop: 10 }}>{lesson?.pat}</div>
          <div className="pattern-vi">{lesson?.patVi}</div>
        </div>
      )}

      {saidBest && (
        <div className="reveal" style={{ "--d": "300ms" }}>
          <div className="step-kicker" style={{ textAlign: "left", marginBottom: 7 }}>Bạn vừa nói được</div>
          <div className="said-quote">{saidBest}</div>
        </div>
      )}

      <div className="reveal" style={{ "--d": "420ms" }}>
        <span className="streak-big">
          <b>{streak}</b>
          <span>ngày liên tục</span>
        </span>
      </div>

      <div className="spacer" />

      <div className="reveal" style={{ "--d": "520ms" }}>
        {canExt && !extDone && (
          <button className="btn" style={{ marginBottom: 9 }} onClick={onExt}>
            Học thêm 10 phút · 6 từ mới
          </button>
        )}
        {extDone && <p className="muted small" style={{ marginTop: 0 }}>★ Hôm nay làm cả phần mở rộng</p>}
        <button className="btn btn-primary" onClick={onExit}>Xong hôm nay</button>
      </div>
    </div>
  );
}
