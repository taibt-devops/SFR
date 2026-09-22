// Màn brief — thứ duy nhất đứng giữa bạn và cuộc gọi. Chỉ hiện cái cần biết TRƯỚC khi mở miệng,
// rồi biến mất hẳn. Trước đây 7 khối chrome này nằm đè lên màn hội thoại suốt cả buổi.
import TtsControls from "./TtsControls.jsx";
import { TALK_TOPICS } from "../data/talkTopics.js";

export default function CallBrief({ roleplay, scn, scnLoading, patterns, chosen, onPickTopic, busy, onSwap, onStart, onBack }) {
  const waitingScn = roleplay && (scnLoading || !scn);

  return (
    <div className="screen">
      <div className="hud">
        <span>{roleplay ? "🎭 ĐÓNG VAI" : "💬 TRÒ CHUYỆN"}</span>
        <button className="hud-mute" onClick={onBack}>✕</button>
      </div>

      {roleplay ? (
        <>
          <div className="eyebrow">Tình huống</div>
          {waitingScn ? (
            <h1 className="t-hero-title pulse">Đang dựng tình huống…</h1>
          ) : (
            <>
              <h1 className="t-hero-title">{scn.title}</h1>
              <div className="card">
                <div className="brief-row"><span>Bạn đóng vai</span><b>{scn.userRole}</b></div>
                <div className="brief-row"><span>Đối phương</span><b>{scn.aiRole}</b></div>
                <div className="brief-row"><span>Nhiệm vụ</span><b>{scn.goal}</b></div>
              </div>
              <button className="btn-link" disabled={scnLoading} onClick={onSwap}>
                {scnLoading ? "Đang dựng…" : "🎲 Đổi tình huống khác"}
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="eyebrow">Nói về</div>
          <h1 className="t-hero-title">{chosen || "Theo bài đã học"}</h1>

          {/* Chọn chủ đề — phần này NGOÀI streak nên được phép chọn (xem chú thích trong Call.jsx). */}
          <div className="topic-pick">
            <button
              className={`goal-chip ${chosen ? "" : "on"}`}
              onClick={() => onPickTopic(null)}
            >Theo bài đã học</button>
            {TALK_TOPICS.map((t) => (
              <button
                key={t}
                className={`goal-chip ${chosen === t ? "on" : ""}`}
                onClick={() => onPickTopic(t)}
              >{t}</button>
            ))}
          </div>

          {/* Thay cho nhãn "Đang luyện: Đời thường & du lịch" cũ — nhãn đó giống hệt nhau suốt 6
              tuần nên chẳng nói lên điều gì. Đây mới là thứ bạn sắp bị ép dùng. */}
          {patterns.length > 0 ? (
            <>
              <div className="step-kicker">Gia sư sẽ ép bạn dùng</div>
              <div className="card">
                {patterns.map((p) => (
                  <div className="brief-pat" key={p}>{p}</div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">
              Chưa học mẫu câu nào — cứ nói tự do, gia sư sẽ bắt chuyện theo trình độ của bạn.
            </p>
          )}
        </>
      )}

      <div className="spacer" />

      <details className="brief-more">
        <summary>Giọng đọc &amp; tốc độ</summary>
        <TtsControls />
      </details>

      <button className="btn btn-primary cta-hero" disabled={busy || waitingScn} onClick={onStart}>
        {busy ? "Đang mở lời…" : "Bắt đầu gọi"}
        <span>{roleplay ? "đối phương mở lời trước" : "gia sư mở lời trước"}</span>
      </button>
    </div>
  );
}
