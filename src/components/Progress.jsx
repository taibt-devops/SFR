// "Tôi nói được gì rồi" (spec §4.3) — màn duy nhất ngoài luồng học.
//
// HAI tab, vì đây là hai câu hỏi khác nhau:
//  • Mẫu câu — "tôi nói được những kiểu câu nào". Mỗi mẫu đi kèm MỘT CÂU DO CHÍNH BẠN NÓI. Đặt
//    tuần 1 cạnh tuần 6 là thấy khác biệt ngay; con số "đã ôn 120 thẻ" không làm được việc đó.
//  • Từ vựng — "tôi có bao nhiêu chữ trong tay". Danh sách này trước đây KHÔNG TỒN TẠI: từ của bài
//    học ở phần mở rộng không hiện ở đâu cả, còn từ tự thêm chỉ được đếm gọn thành một dòng.
import { useMemo, useState } from "react";
import { learnedPatterns, learnedWords, completedCount } from "../srs/course.js";
import { loadMyWords, myWordsFor } from "../srs/myWords.js";
import { TOTAL_DAYS } from "../data/course/outline.js";
import { IcoVolume, IcoBack, IcoStar } from "./Icon.jsx";
import { speak } from "../utils/tts.js";
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

function WordList({ words }) {
  const [loc, setLoc] = useState("all"); // all | mine

  if (!words.length) {
    return (
      <p className="muted">
        Chưa có từ nào. Từ của bài xuất hiện sau khi bạn làm <b>phần mở rộng</b>; từ bạn tự thêm
        lúc luyện nói, hoặc câu lưu từ ô hỏi đáp, thì vào đây ngay.
      </p>
    );
  }

  const cuaToi = words.filter((w) => w.mine);
  const hien = loc === "mine" ? cuaToi : words;

  return (
    <>
      {/* Chỉ hiện bộ lọc khi thật sự có cái để lọc — một nút lọc ra 0 kết quả là nút vô nghĩa. */}
      {cuaToi.length > 0 && (
        <div className="chips" style={{ marginBottom: 4 }}>
          <button className={`chip${loc === "all" ? " chip-on" : ""}`} onClick={() => setLoc("all")}>
            Tất cả ({words.length})
          </button>
          <button className={`chip${loc === "mine" ? " chip-on" : ""}`} onClick={() => setLoc("mine")}>
            Tôi tự thêm ({cuaToi.length})
          </button>
        </div>
      )}

      <div className="vocab">
        {hien.map((w) => (
          <div className="vocab-item" key={`${w.day}-${w.w}`}>
            <div className="vocab-top">
              <div className="vocab-w">
                {w.w}
                {w.mine && <IcoStar size={13} />}
              </div>
              <button className="ic-btn" onClick={() => speak(w.en || w.w)} aria-label={"Nghe: " + w.w}>
                <IcoVolume size={15} />
              </button>
            </div>
            {(w.ipa || w.m) && (
              <div className="vocab-sub">
                {w.ipa && <span className="vocab-ipa">{w.ipa}</span>}
                {w.m}
              </div>
            )}
            {w.en && <div className="vocab-ex">{w.en}</div>}
            <div className="learned-meta">{w.mine ? "Bạn tự thêm" : `Bài ${w.day}`} · ngày {w.day}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Progress({ lessons, progress, onBack }) {
  const [tab, setTab] = useState("pat"); // pat | word
  const mine = useMemo(() => loadMyWords(), []);
  const learned = useMemo(() => learnedPatterns(lessons, progress), [lessons, progress]);
  const words = useMemo(() => learnedWords(lessons, progress, mine), [lessons, progress, mine]);
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

      {/* Hai con số này CŨNG là hai cái tab — bấm vào số là sang đúng danh sách của nó. */}
      <div className="tabs">
        <button className={`tab${tab === "pat" ? " on" : ""}`} onClick={() => setTab("pat")}>
          <b>{done}</b>
          <span>/ {TOTAL_DAYS} mẫu câu</span>
        </button>
        <button className={`tab${tab === "word" ? " on" : ""}`} onClick={() => setTab("word")}>
          <b>{words.length}</b>
          <span>từ vựng</span>
        </button>
      </div>

      {tab === "pat" ? <PatternList learned={learned} mine={mine} /> : <WordList words={words} />}

      <div className="step-kicker" style={{ marginTop: 8 }}>14 ngày gần nhất</div>
      <ProgressChart />

      <div className="spacer" />
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
