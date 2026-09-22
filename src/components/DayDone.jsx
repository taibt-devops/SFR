// Màn đóng ngày (spec §4.1) — một màn, không cuộn, kết thúc dứt khoát.
// App KHÔNG mời học thêm sau khi bấm "Xong hôm nay": kết thúc rõ ràng khiến lần sau mở ra nhẹ đầu.
// Phần mở rộng là phần thưởng cho ngày khoẻ, không phải món nợ cho ngày mệt (C12).

export default function DayDone({ lesson, streak, saidBest, extDone, canExt, onExt, onExit }) {
  return (
    <div className="screen screen-mid">
      <div className="done-mark">✓</div>

      {lesson?.review ? (
        <>
          <p className="muted">Chốt tuần {lesson.week} xong</p>
          <h1>Tuần này bạn đã nói được thêm 5 mẫu câu</h1>
        </>
      ) : (
        <>
          <p className="muted">1% hôm nay của bạn</p>
          <div className="pattern">{lesson?.pat}</div>
          <div className="pattern-vi">{lesson?.patVi}</div>
        </>
      )}

      {saidBest && (
        <>
          <p className="muted small" style={{ marginBottom: 0 }}>Bạn vừa nói được:</p>
          <div className="said-quote">“{saidBest}”</div>
        </>
      )}

      <div className="streak">🔥 {streak} ngày liên tục</div>

      <div className="spacer" />

      {canExt && !extDone && (
        <button className="btn" onClick={onExt}>Học thêm 10 phút — 6 từ mới</button>
      )}
      {extDone && <p className="muted small">★ Hôm nay bạn làm cả phần mở rộng</p>}

      <button className="btn btn-primary" onClick={onExit}>Xong hôm nay</button>
    </div>
  );
}
