// Màn cuộc gọi: hội thoại ở giữa, dải mẫu câu tick dần, nút nói to ở đáy. Không thanh công cụ,
// không bộ chọn giọng, không thẻ tình huống — tất cả đã xong ở màn brief.
// Không có đồng hồ: chủ dự án chốt bỏ, đếm giờ khi đang nói tạo áp lực không cần thiết.
import { useEffect, useRef } from "react";
import { IcoMic, IcoStop, IcoRedo, IcoCheck } from "./Icon.jsx";
import CallBubble from "./CallBubble.jsx";

export default function CallScreen({
  roleplay, scn, history, phase, error, spoken, dueWords, shadow, shadowing, busy, started,
  onWord, onShadow, onAddWord, onRec, onStop, onRedo, onEnd, onBack,
}) {
  const logRef = useRef(null);

  // Tin mới thì cuộn xuống cuối, đừng để lượt vừa rồi trôi khỏi màn.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, phase]);

  return (
    <div className="screen call">
      <div className="hud">
        <span className="call-live">
          <i className="call-dot" />
          {roleplay && scn ? scn.title : "ĐANG NÓI"}
        </span>
        <span>
          {started && <button className="hud-mute" title="Kết thúc & tổng kết" onClick={onEnd}>Kết thúc</button>}
          <button className="hud-mute" onClick={onBack}>✕</button>
        </span>
      </div>

      <div className="call-log" ref={logRef}>
        {history.map((m, i) => (
          <CallBubble
            key={i}
            role={m.role}
            text={m.content}
            onWord={onWord}
            onShadow={onShadow}
            onAddWord={onAddWord}
          />
        ))}
        {busy && <p className="muted center pulse">Đang nghĩ…</p>}
      </div>

      {shadow && (
        <div className="card">
          <p className="muted small" style={{ margin: "0 0 6px" }}>Đọc theo — từ đỏ là chưa khớp:</p>
          <p className="heard" style={{ margin: 0 }}>
            {shadow.result.map((x, i) => (
              <span key={i} className={x.ok ? "w-ok" : "w-bad"}>{x.word} </span>
            ))}
          </p>
        </div>
      )}

      {error && <div className="err">{error}</div>}

      {/* Dải mẫu câu cần dùng — tick dần khi bạn thật sự nói ra được. */}
      {dueWords.length > 0 && (
        <div className="call-goals">
          {dueWords.map((w) => (
            <span key={w} className={`goal-chip ${spoken.has(w) ? "on" : ""}`}>
              {spoken.has(w) && <IcoCheck size={12} />}{w}
            </span>
          ))}
        </div>
      )}

      {shadowing && <p className="muted center small">Đang đọc theo… bấm Dừng khi xong.</p>}

      {phase === "recording" ? (
        <button className="btn btn-rec rec-live cta-hero" onClick={onStop}><IcoStop size={16} /> Dừng</button>
      ) : (
        <button className="btn btn-primary cta-hero" disabled={busy} onClick={onRec}>
          <IcoMic size={19} /> Nói
        </button>
      )}

      {started && phase === "idle" && (
        <button className="btn-link" onClick={onRedo}><IcoRedo size={15} /> Nói lại lượt vừa rồi</button>
      )}
    </div>
  );
}
