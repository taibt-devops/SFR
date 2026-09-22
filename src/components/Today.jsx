// Màn chờ — thứ đầu tiên thấy khi mở app. Đúng MỘT hành động chính.
// Không chọn chủ đề, không chọn trình độ, không chọn chế độ (C9): chương trình đã quyết sẵn bài
// của hôm nay, việc của người học chỉ là bấm bắt đầu.
//
// Phần động lực ở đây là BẰNG CHỨNG CÔNG SỨC, không phải lời cổ vũ: vòng tiến độ tới 72 mẫu câu,
// chuỗi ngày, và dải 14 ngày cho thấy rõ mình đã bỏ ngày nào.
import { TOTAL_DAYS } from "../data/course/outline.js";
import { useState } from "react";
import Ring from "./Ring.jsx";
import { isMuted, setMuted, tick } from "../utils/sfx.js";
import { useCountUp } from "../hooks/useCountUp.js";

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
    if (!next) tick(); // bật lại thì kêu một tiếng cho biết là đã bật
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

  return (
    <div className="screen screen-home">
      <div className="hud">
        <span><b>1%</b><i>/</i>NGÀY</span>
        <span>
          TUẦN <b>{lesson.week}</b><i>/</i>12
          <button className="hud-mute" onClick={toggleMute} title={mute ? "Bật âm" : "Tắt âm"}>
            {mute ? "🔇" : "🔊"}
          </button>
        </span>
      </div>

      <div className="t-hero reveal" style={{ "--d": "40ms" }}>
        <Ring value={completed} total={TOTAL_DAYS} label={lesson.day} sub={`/ ${TOTAL_DAYS}`} />
        <div className="t-hero-txt">
          <div className="eyebrow">{lesson.review ? "Chốt tuần" : "Bài hôm nay"}</div>
          <h1 className="t-hero-title">{lesson.title}</h1>
          <p className="t-hero-sub">
            {lesson.review
              ? "Không có mẫu câu mới. Ôn lại, chấm trình độ, rồi nói tự do."
              : "Một mẫu câu mới. 15 phút, nói bằng mồm."}
          </p>
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

      {/* Lấp khoảng giữa màn bằng thứ CÓ ÍCH: mẫu câu gần nhất + câu chính bạn đã nói ra.
          Nhìn thấy bằng chứng mình từng nói được là động lực; khoảng trống thì không. */}
      {last && (
        <div className="t-last reveal" style={{ "--d": "230ms" }}>
          <div className="step-kicker">Gần nhất bạn nắm được</div>
          <div className="t-last-pat">{last.pat}</div>
          {last.said && <div className="t-last-said">“{last.said}”</div>}
        </div>
      )}

      <div className="spacer" />

      {/* Nhãn phải nói ĐÚNG việc nút sẽ làm: `lesson` ở đây luôn là bài CHƯA xong lõi, nên khi hôm
          nay đã học rồi thì bấm vào là mở bài KẾ TIẾP, không phải học lại bài cũ. */}
      <button className="btn btn-primary cta-hero reveal" style={{ "--d": "250ms" }} onClick={() => { tick(); onStart(); }}>
        {doneToday ? "Học tiếp bài sau" : "Bắt đầu"}
        <span>{doneToday ? "✓ 1% hôm nay đã xong" : "15 phút · bắt buộc"}</span>
      </button>

      <div className="reveal" style={{ "--d": "310ms" }}>
        <FreeTalk {...talk} />
      </div>

      <button className="btn-link" onClick={onProgress}>Tôi nói được gì rồi →</button>
    </div>
  );
}
