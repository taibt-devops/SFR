// Mini-story (§5.7): sinh đoạn ngắn dùng từ due → đọc + TTS. 3 trạng thái loading/error/success.
// Auto-tạo khi mở (1 lần). TTS chỉ phát trong cú chạm người dùng (iOS) — nút "Đọc to".
import { useCallback, useEffect, useState } from "react";
import { miniStory } from "../ai/story.js";

function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  } catch {
    /* không hỗ trợ TTS */
  }
}

export default function MiniStory({ dueWords, onBack }) {
  const [status, setStatus] = useState("loading"); // loading | error | done
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    if (!dueWords.length) { setStatus("empty"); return; } // không có từ due → không phải lỗi
    setStatus("loading");
    setError("");
    try {
      const t = await miniStory(dueWords);
      setText(t);
      setStatus(t ? "done" : "error");
      if (!t) setError("Không tạo được mini-story — thử lại.");
    } catch (e) {
      setError(String(e.message || e));
      setStatus("error");
    }
  }, [dueWords]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Mini-story hôm nay</span>
        <button className="link-exit" onClick={onBack}>← Về</button>
      </div>
      <p className="app-sub" style={{ marginTop: 6 }}>
        Dùng từ đang ôn: {dueWords.slice(0, 8).join(", ") || "—"}
      </p>

      {status === "loading" && <p className="empty-msg">Đang tạo mini-story…</p>}

      {status === "empty" && (
        <p className="empty-msg">Chưa có từ đến hạn để dệt thành chuyện. Hãy học thêm hoặc quay lại sau.</p>
      )}

      {status === "error" && (
        <p className="empty-msg" style={{ color: "var(--red)" }}>
          {error}<br />
          <button className="link-exit" onClick={run}>Thử lại</button>
        </p>
      )}

      {status === "done" && (
        <>
          <div className="story-text">{text}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="cta-ghost" style={{ marginTop: 0 }} onClick={() => speak(text)}>🔊 Đọc to</button>
            <button className="cta-ghost" style={{ marginTop: 0 }} onClick={run}>Tạo lại</button>
          </div>
        </>
      )}
    </div>
  );
}
