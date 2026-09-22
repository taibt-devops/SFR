// Nhịp 3 (mở rộng) — 6 từ mới, mỗi từ ghép thẳng vào mẫu câu HÔM NAY.
// Không học từ rời: thuộc `refill` không phải để nhớ nghĩa "rót thêm", mà để bật ra được cả câu.
// Xong nhịp này thì item `word::...` mới vào hàng đợi ôn (spec §2.3).
import { useState } from "react";
import StepShell from "./StepShell.jsx";
import SpeakCheck from "./SpeakCheck.jsx";
import { speak } from "../utils/tts.js";

export default function StepWords({ lesson, bar, onDone }) {
  const [i, setI] = useState(0);
  const [heard, setHeard] = useState(false);

  const w = lesson.words[i];
  const last = i + 1 >= lesson.words.length;

  const next = () => {
    if (last) return onDone();
    setI(i + 1);
    setHeard(false);
  };

  return (
    <StepShell bar={bar} kicker={`Từ mới · ${i + 1}/${lesson.words.length}`} title="">
      <div className="card">
        <div className="pattern" style={{ fontSize: 30 }}>{w.w}</div>
        <div className="pattern-vi">
          {w.ipa} · {w.m}
        </div>
      </div>

      {!heard ? (
        <>
          <p className="muted small center">Nghe câu chứa từ này trước, rồi nói lại.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              speak(w.en);
              setHeard(true);
            }}
          >
            🔊 Nghe câu mẫu
          </button>
          <div className="spacer" />
        </>
      ) : (
        <>
          <SpeakCheck
            key={w.w}
            target={w.en}
            autoHint
            prompt={
              <>
                <p className="muted small" style={{ marginBottom: 0 }}>Nói câu này:</p>
                <p className="prompt-vi">{w.vi}</p>
              </>
            }
            footer={() => (
              <>
                <div className="card">
                  <p className="answer-en" style={{ margin: 0 }}>{w.en}</p>
                </div>
                <button className="btn btn-primary" onClick={next}>
                  {last ? "Xong 6 từ" : "Từ tiếp theo"}
                </button>
              </>
            )}
          />
          <div className="spacer" />
          <button className="btn-link" onClick={next}>Bỏ qua từ này</button>
        </>
      )}
    </StepShell>
  );
}
