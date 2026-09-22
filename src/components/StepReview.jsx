// Nhịp 0 — ôn nhanh 5–8 item đến hạn. Người học KHÔNG thấy chữ "SRS", chỉ thấy "ôn nhanh".
// Ôn cũng phải nói ra miệng, không lật thẻ đọc thầm.
//
// `q` do NGƯỜI HỌC chọn (C5): máy chỉ gợi ý dựa trên độ khớp, lịch ôn vẫn do sm2.js tính.
import { useState } from "react";
import StepShell from "./StepShell.jsx";
import SpeakCheck, { PASS } from "./SpeakCheck.jsx";
import { tick } from "../utils/sfx.js";
import { promptFor } from "../srs/items.js";

export default function StepReview({ bar, queue, getState, onRate, onDone }) {
  const [i, setI] = useState(0);

  // Ngày đầu tiên chưa có gì để ôn — nói thẳng rồi đi tiếp, đừng bắt nhìn màn trống.
  if (queue.length === 0) {
    return (
      <StepShell bar={bar} kicker="Ôn nhanh" title="Chưa có gì để ôn">
        <p className="muted">Các mẫu câu đã học sẽ quay lại đây đúng lúc bạn sắp quên.</p>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={onDone}>Vào bài hôm nay</button>
      </StepShell>
    );
  }

  const item = queue[Math.min(i, queue.length - 1)];
  const state = getState(item.id);
  const v = promptFor(item, state);
  const last = i + 1 >= queue.length;

  const rate = (q) => {
    tick();
    onRate(item.id, q);
    if (last) onDone();
    else setI(i + 1);
  };

  return (
    <StepShell bar={bar} kicker={`Ôn nhanh · ${i + 1}/${queue.length}`} title="">
      <SpeakCheck
        key={item.id}
        target={v.en}
        prompt={
          <>
            <p className="muted small" style={{ marginBottom: 0 }}>
              {item.kind === "word" ? `Dùng từ "${item.label}" — ${item.sub}` : "Nói lại câu này:"}
            </p>
            <p className="prompt-vi">{v.vi}</p>
          </>
        }
        footer={(result) => (
          <>
            <div className="card">
              <p className="muted small" style={{ margin: "0 0 4px" }}>Câu chuẩn</p>
              <p className="answer-en" style={{ margin: 0 }}>{v.en}</p>
            </div>
            <p className="muted small center" style={{ margin: 0 }}>
              Bạn tự chấm — máy chỉ gợi ý{result.score >= PASS ? " (nghe khớp)" : " (nghe còn lệch)"}
            </p>
            <div className="rate">
              <button className="btn rate-again" onClick={() => rate(2)}>Chưa nhớ</button>
              <button className="btn" onClick={() => rate(3)}>Khó</button>
              <button className={`btn ${result.score >= PASS ? "rate-good" : ""}`} onClick={() => rate(4)}>Tốt</button>
              <button className="btn" onClick={() => rate(5)}>Dễ</button>
            </div>
          </>
        )}
      />
      <div className="spacer" />
    </StepShell>
  );
}
