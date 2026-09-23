// "Tôi nói được gì rồi" (spec §4.3) — màn duy nhất ngoài luồng học.
//
// HAI tab, vì đây là hai câu hỏi khác nhau:
//  • Mẫu câu — "tôi nói được những kiểu câu nào". Mỗi mẫu đi kèm MỘT CÂU DO CHÍNH BẠN NÓI. Đặt
//    tuần 1 cạnh tuần 6 là thấy khác biệt ngay; con số "đã ôn 120 thẻ" không làm được việc đó.
// Từ vựng có MÀN RIÊNG (`Vocab.jsx`) — ô đếm bên phải là lối vào đó. Cố ý không vẽ danh sách từ
// ở cả hai nơi: hai bản cài đặt của cùng một danh sách là hai chỗ để chúng lệch nhau.
import { useMemo } from "react";
import { learnedPatterns, countLearnedWords, completedCount } from "../srs/course.js";
import { loadMyWords, myWordsFor } from "../srs/myWords.js";
import { TOTAL_DAYS } from "../data/course/outline.js";
import { IcoBack, IcoArrow } from "./Icon.jsx";
import ProgressChart from "./ProgressChart.jsx";

const fmt = (ts) => (ts ? new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");

function PatternList({ learned, mine }) {
  if (!learned.length) {
    return <p className="muted">Chưa có mẫu câu nào. Học xong bài đầu tiên là nó xuất hiện ở đây.</p>;
  }
  return (
    <div className="learned">
      {learned.map((l) => (
        <div className="learned-item" key={l.day}>
          <div className="learned-pat">{l.pat}</div>
          <div className="muted small">{l.patVi}</div>
          {l.said && <div className="learned-said">“{l.said}”</div>}
          {myWordsFor(mine, l.day).length > 0 && (
            <div className="learned-mine">
              + {myWordsFor(mine, l.day).length} từ bạn tự thêm:{" "}
              {myWordsFor(mine, l.day).map((x) => x.w).join(" · ")}
            </div>
          )}
          <div className="learned-meta">
            Ngày {l.day} · tuần {l.week} · {fmt(l.doneAt)}
            {l.ext ? " · có phần mở rộng" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Progress({ lessons, progress, onBack, onVocab }) {
  const mine = useMemo(() => loadMyWords(), []);
  const learned = useMemo(() => learnedPatterns(lessons, progress), [lessons, progress]);
  const soTu = useMemo(() => countLearnedWords(lessons, progress, mine), [lessons, progress, mine]);
  const done = completedCount(progress);

  return (
    <div className="screen">
      <header className="hd">
        <div className="hd-row">
          <span className="hd-label">Tiến bộ</span>
          <button className="hd-mute" onClick={onBack} aria-label="Về màn chính"><IcoBack size={17} /></button>
        </div>
      </header>

      <h1 className="h-title" style={{ marginTop: 4 }}>Tôi nói được gì rồi</h1>

      <div className="tabs">
        <div className="tab on">
          <b>{done}</b>
          <span>/ {TOTAL_DAYS} mẫu câu</span>
        </div>
        <button className="tab" onClick={onVocab}>
          <b>{soTu}</b>
          <span className="inline-ic">từ vựng <IcoArrow size={13} /></span>
        </button>
      </div>

      <PatternList learned={learned} mine={mine} />

      <div className="step-kicker" style={{ marginTop: 8 }}>14 ngày gần nhất</div>
      <ProgressChart />

      <div className="spacer" />
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
