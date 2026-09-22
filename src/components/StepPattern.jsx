// Nhịp 2 — lộ mẫu câu. Đây là "1%" của ngày hôm nay.
// Giải thích bằng tiếng Việt đời thường, KHÔNG thuật ngữ ngữ pháp: người học yếu cấu trúc thì
// "thì hiện tại hoàn thành" không giúp được gì, "dùng khi gọi món" thì giúp.
import StepShell from "./StepShell.jsx";
import { speak } from "../utils/tts.js";

export default function StepPattern({ lesson, bar, onDone }) {
  return (
    <StepShell bar={bar} kicker="Mẫu câu hôm nay" title="">
      {/* Thẻ "nóng" — viền sáng + quầng: đây là 1% của ngày, phải nổi hơn mọi thứ khác trên màn. */}
      <div className="card card-hot">
        <div className="eyebrow" style={{ marginBottom: 10 }}>1% hôm nay</div>
        <div className="pattern">{lesson.pat}</div>
        <div className="pattern-vi">{lesson.patVi}</div>
      </div>

      <div className="note">{lesson.note}</div>

      <div className="card">
        {lesson.ex.map((e) => (
          <div className="ex-row" key={e.en}>
            <div style={{ flex: 1 }}>
              <div className="ex-en">{e.en}</div>
              <div className="ex-vi">{e.vi}</div>
            </div>
            <button className="btn btn-sm" onClick={() => speak(e.en)} aria-label={`Nghe: ${e.en}`}>
              🔊
            </button>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn btn-primary" onClick={onDone}>Thuộc rồi — sang phần nói</button>
    </StepShell>
  );
}
