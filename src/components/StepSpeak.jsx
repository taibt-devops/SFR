// Nhịp 4 (lõi, 3 câu) và 4b (mở rộng, 2 câu khó hơn) — nhịp hiệu quả nhất của cả buổi.
// Việt → Anh, nói bằng mồm. Câu nào khớp cao nhất sẽ thành "bạn vừa nói được" ở màn đóng ngày.
import { useState } from "react";
import StepShell from "./StepShell.jsx";
import SpeakCheck, { PASS } from "./SpeakCheck.jsx";
import { tick } from "../utils/sfx.js";

export default function StepSpeak({ lesson, bar, drills, kicker, onDone, onSaid }) {
  const [i, setI] = useState(0);
  const d = drills[i];
  const last = i + 1 >= drills.length;

  const next = (result) => {
    tick();
    // Chỉ ghi câu ĐẠT làm bằng chứng tiến bộ — câu sai không phải thứ để khoe lại sau này.
    if (result.score >= PASS) onSaid?.(d.en, result.score);
    if (last) onDone();
    else setI(i + 1);
  };

  return (
    <StepShell bar={bar} kicker={`${kicker} · câu ${i + 1}/${drills.length}`} title="">
      <SpeakCheck
        key={d.en}
        target={d.en}
        prompt={
          <>
            <p className="muted small" style={{ marginBottom: 0 }}>Nói câu này bằng tiếng Anh:</p>
            <p className="prompt-vi">{d.vi}</p>
            <p className="muted small">
              Mẫu: <b>{lesson.pat}</b>
            </p>
          </>
        }
        footer={(result) => (
          <>
            <div className="card">
              <p className="muted small" style={{ margin: "0 0 4px" }}>Câu chuẩn</p>
              <p className="answer-en" style={{ margin: 0 }}>{d.en}</p>
            </div>
            <button className="btn btn-primary" onClick={() => next(result)}>
              {last ? "Xong phần nói" : "Câu tiếp theo"}
            </button>
          </>
        )}
      />
      <div className="spacer" />
    </StepShell>
  );
}
