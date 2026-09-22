// Màn chờ — thứ đầu tiên thấy khi mở app. Đúng MỘT hành động chính.
// Không chọn chủ đề, không chọn trình độ, không chọn chế độ (C9): chương trình đã quyết sẵn bài
// của hôm nay, việc của người học chỉ là bấm bắt đầu.
//
// Màn này có HAI hình dạng, vì ngày đầu và ngày thứ ba cần hai thứ khác hẳn nhau:
//
//  • Chưa học gì  → VẠCH XUẤT PHÁT. Bản đầu hiện vòng tiến độ rỗng + "0 ngày liên tục" +
//    "0 mẫu câu" + 14 ô xám: một bức tường số 0, đúng vào lúc người học cần động lực nhất.
//    Thay bằng lời hứa cụ thể 15 phút tới sẽ làm gì — người mới cũng chưa biết điều đó.
//  • Đã có tiến độ → BẢNG THÀNH TÍCH. Vòng tiến độ, chuỗi ngày, dải 14 ngày, mẫu câu gần nhất.
//    Lúc này các con số mới có nghĩa, và nhìn thấy chúng chính là động lực.
import { useState } from "react";
import Ring from "./Ring.jsx";
import { isMuted, setMuted, tick } from "../utils/sfx.js";
import { useCountUp } from "../hooks/useCountUp.js";
import { TOTAL_DAYS } from "../data/course/outline.js";

function Strip({ days }) {
  return (
    <div className="strip" aria-label="14 ngày gần nhất">
      {days.map((d) => (
        <span
          key={d.day}
          className={`strip-cell${d.done ? " on" : ""}${d.ext ? " ext" : ""}${d.today ? " today" : ""}`}
        />
      ))}
    </div>
  );
}

function FreeTalk({ onRoleplay, onChat, onWarmup }) {
  return (
    <div className="free-talk">
      <div className="step-kicker">Nói tự do · không tính streak</div>
      <div className="btn-row btn-trio">
        <button className="btn" onClick={onRoleplay}>🎭 Đóng vai</button>
        <button className="btn" onClick={onChat}>💬 Trò chuyện</button>
        <button className="btn" onClick={onWarmup}>🎤 Khởi động</button>
      </div>
    </div>
  );
}

// Lời hứa cụ thể cho 15 phút tới — người mới chưa biết sắp phải làm gì.
function Plan({ review }) {
  // Ngày chốt tuần giờ có thêm báo cáo tiến bộ trước khi ôn (§10.6b, Phần 10 Task 12).
  const steps = review
    ? ["Xem báo cáo tiến bộ tuần", "Ôn lại mẫu câu cả tuần", "Chấm trình độ nói", "Trò chuyện tự do"]
    : ["Nghe 4 câu, đoán nghĩa", "Lộ mẫu câu của hôm nay", "Nói 5 câu bằng mồm"];
  return (
    <div className="card">
      <div className="eyebrow">15 phút tới</div>
      <ol className="plan-list">
        {steps.map((s, i) => (
          <li key={s}><b>{i + 1}</b>{s}</li>
        ))}
      </ol>
    </div>
  );
}

export default function Today({
  lesson, streak, doneToday, completed, days, last,
  onStart, onProgress, onWarmup, onRoleplay, onChat,
}) {
  const talk = { onRoleplay, onChat, onWarmup };
  const [mute, setMute] = useState(isMuted);
  const nStreak = useCountUp(streak, { delay: 260 });
  const nDone = useCountUp(completed, { delay: 320 });

  // Tắt/bật âm — để ở HUD, nhỏ thôi. Học ở văn phòng thì phải tắt được ngay, đừng bắt đi tìm.
  const toggleMute = () => {
    const next = !mute;
    setMuted(next);
    setMute(next);
    if (!next) tick();
  };

  // Hết phần đã soạn — nói thật thay vì hiện màn trống khó hiểu.
  if (!lesson) {
    return (
      <div className="screen screen-mid">
        <div className="done-mark">✓</div>
        <h1 className="t-hero-title">Hết phần đã soạn</h1>
        <p className="muted">
          {completed}/{TOTAL_DAYS} mẫu câu. Các tuần sau chưa có nội dung — soạn tiếp rồi quay lại.
        </p>
        <div className="spacer" />
        <FreeTalk {...talk} />
        <button className="btn" onClick={onProgress}>Xem tôi nói được gì rồi</button>
      </div>
    );
  }

  const fresh = completed === 0;

  const hud = (
    <div className="hud">
      <span><b>1%</b><i>/</i>NGÀY</span>
      <span>
        TUẦN <b>{lesson.week}</b><i>/</i>{Math.ceil(TOTAL_DAYS / 6)}
        <button className="hud-mute" onClick={toggleMute} title={mute ? "Bật âm" : "Tắt âm"}>
          {mute ? "🔇" : "🔊"}
        </button>
      </span>
    </div>
  );

  const cta = (
    <button
      className="btn btn-primary cta-hero reveal"
      style={{ "--d": "250ms" }}
      onClick={() => { tick(); onStart(); }}
    >
      {doneToday ? "Học tiếp bài sau" : "Bắt đầu"}
      <span>{doneToday ? "✓ 1% hôm nay đã xong" : "15 phút · bắt buộc"}</span>
    </button>
  );

  // ── Vạch xuất phát: chưa có gì để khoe, nên hứa thay vì đếm ──
  if (fresh) {
    return (
      <div className="screen screen-home">
        {hud}

        <div className="reveal" style={{ "--d": "40ms" }}>
          <div className="eyebrow">Ngày đầu tiên</div>
          <h1 className="t-hero-title start-title">{lesson.title}</h1>
          <p className="t-hero-sub">
            Mỗi ngày đúng một mẫu câu. Sau {TOTAL_DAYS} ngày là {TOTAL_DAYS} cách nói bạn chưa có hôm nay.
          </p>
        </div>

        <div className="reveal" style={{ "--d": "140ms" }}>
          <Plan review={lesson.review} />
        </div>

        <div className="spacer" />
        {cta}
        <div className="reveal" style={{ "--d": "310ms" }}>
          <FreeTalk {...talk} />
        </div>
      </div>
    );
  }

  // ── Bảng thành tích ──
  return (
    <div className="screen screen-home">
      {hud}

      <div className="t-hero reveal" style={{ "--d": "40ms" }}>
        <Ring value={completed} total={TOTAL_DAYS} label={lesson.day} sub={`/ ${TOTAL_DAYS}`} />
        <div className="t-hero-txt">
          <div className="eyebrow">{lesson.review ? "Chốt tuần" : "Bài hôm nay"}</div>
          <h1 className="t-hero-title">{lesson.title}</h1>
        </div>
      </div>

      <div className="stats reveal" style={{ "--d": "120ms" }}>
        <div className={`stat stat-streak${streak >= 3 ? " is-hot" : ""}`}>
          <b>{nStreak}</b>
          <span>ngày liên tục</span>
        </div>
        <div className="stat">
          <b>{nDone}</b>
          <span>mẫu câu đã nắm</span>
        </div>
      </div>

      <div className="reveal" style={{ "--d": "190ms" }}>
        <Strip days={days} />
      </div>

      {/* Bằng chứng mình từng nói được — mạnh hơn mọi con số. */}
      {last && (
        <div className="t-last reveal" style={{ "--d": "230ms" }}>
          <div className="step-kicker">Gần nhất bạn nắm được</div>
          <div className="t-last-pat">{last.pat}</div>
          {last.said && <div className="t-last-said">“{last.said}”</div>}
        </div>
      )}

      <div className="spacer" />
      {cta}
      <div className="reveal" style={{ "--d": "310ms" }}>
        <FreeTalk {...talk} />
      </div>
      <button className="btn-link" onClick={onProgress}>Tôi nói được gì rồi →</button>
    </div>
  );
}
