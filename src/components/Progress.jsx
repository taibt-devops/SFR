// "Tôi nói được gì rồi" (spec §4.3) — màn duy nhất ngoài luồng học.
// Mỗi mẫu câu đi kèm MỘT CÂU DO CHÍNH NGƯỜI HỌC NÓI. Đặt tuần 1 cạnh tuần 6 là thấy khác biệt ngay;
// con số "đã ôn 120 thẻ" không bao giờ làm được việc đó.
import { learnedPatterns, completedCount } from "../srs/course.js";
import { TOTAL_DAYS } from "../data/course/outline.js";
import ProgressChart from "./ProgressChart.jsx";

const fmt = (ts) => (ts ? new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");

export default function Progress({ lessons, progress, streak, onBack }) {
  const learned = learnedPatterns(lessons, progress);
  const done = completedCount(progress);

  return (
    <div className="screen">
      <h1>Tôi nói được gì rồi</h1>

      <div className="meta-row" style={{ justifyContent: "flex-start" }}>
        <span className="words-count">
          <b>{done}</b> / {TOTAL_DAYS} mẫu câu
        </span>
        <span>🔥 {streak} ngày</span>
      </div>

      {learned.length === 0 ? (
        <p className="muted">Chưa có mẫu câu nào. Học xong bài đầu tiên là nó xuất hiện ở đây.</p>
      ) : (
        <div className="learned">
          {learned.map((l) => (
            <div className="learned-item" key={l.day}>
              <div className="learned-pat">{l.pat}</div>
              <div className="muted small">{l.patVi}</div>
              {l.said && <div className="learned-said">“{l.said}”</div>}
              <div className="learned-meta">
                Ngày {l.day} · tuần {l.week} · {fmt(l.doneAt)}
                {l.ext ? " · ★ có phần mở rộng" : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="step-kicker" style={{ marginTop: 8 }}>14 ngày gần nhất</div>
      <ProgressChart />

      <div className="spacer" />
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
