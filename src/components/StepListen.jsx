// Nhịp 1 — nghe 2 câu TRƯỚC khi biết luật (spec §3.1).
// Cố ý đặt trước nhịp "lộ mẫu": vào bài bằng tai rồi mới biết cấu trúc, để mẫu câu dính vào phản xạ
// thay vì nằm trong sổ tay. Chưa hiện `pat` ở màn này.
import { useMemo, useState } from "react";
import StepShell from "./StepShell.jsx";
import { speak } from "../utils/tts.js";
import { good, miss, tick } from "../utils/sfx.js";

const N = 4; // nghe 4 câu (2026-09-22: trước là 2, buổi học đầu khoá hụt so với 15 phút)

// Xoay vòng đáp án theo chỉ số câu hỏi → tất định (không nhảy loạn mỗi lần render).
function optionsFor(lesson, qi) {
  const all = lesson.ex.map((e) => e.vi);
  return all.map((_, i) => all[(i + qi) % all.length]);
}

export default function StepListen({ lesson, bar, onDone }) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);

  const ex = lesson.ex[qi];
  const options = useMemo(() => optionsFor(lesson, qi), [lesson, qi]);
  const correct = picked === ex.vi;

  const pick = (vi) => {
    setPicked(vi);
    (vi === ex.vi ? good : miss)();
  };

  const next = () => {
    tick();
    if (qi + 1 >= N) return onDone();
    setQi(qi + 1);
    setPicked(null);
  };

  return (
    <StepShell bar={bar} kicker={`Nghe trước · câu ${qi + 1}/${N}`} title="Nghe rồi đoán nghĩa">
      <p className="muted small">Chưa cần hiểu hết. Nghe lấy âm trước, lát nữa mới lộ cấu trúc.</p>

      <button className="btn btn-primary" onClick={() => speak(ex.en)}>🔊 Nghe câu này</button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((vi) => (
          <button
            key={vi}
            className={`btn ${picked && vi === ex.vi ? "rate-good" : picked === vi ? "rate-again" : ""}`}
            disabled={!!picked}
            onClick={() => pick(vi)}
          >
            {vi}
          </button>
        ))}
      </div>

      {picked && (
        <>
          <div className="card">
            <div className={`verdict ${correct ? "verdict-ok" : "verdict-bad"}`}>
              {correct ? "✓ Đúng" : "Chưa đúng — nghe lại một lần nữa"}
            </div>
            <p className="ex-en" style={{ marginBottom: 2 }}>{ex.en}</p>
            <p className="ex-vi" style={{ margin: 0 }}>{ex.vi}</p>
          </div>
          <button className="btn btn-primary" onClick={next}>
            {qi + 1 >= N ? "Xong — xem cấu trúc" : "Câu tiếp theo"}
          </button>
        </>
      )}

      <div className="spacer" />
    </StepShell>
  );
}
