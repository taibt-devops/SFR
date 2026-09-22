// Hộp "nói rồi chấm" dùng chung cho nhịp 0 (ôn), 4/4b (drill) và 3 (từ mới).
// Vòng đời: bấm mic → ghi âm → Whisper → so từng từ với câu đích → hiện kết quả + nghe mẫu.
//
// KHÔNG có ô gõ chữ (C10). Mic hỏng thì báo lỗi và cho thử lại — không mở đường trốn bằng bàn phím,
// vì gõ chữ đúng là chỗ người học né việc mở miệng.
import { useCallback, useState } from "react";
import { useRecorder } from "../hooks/useRecorder.js";
import { diffWords } from "../utils/voiceMatch.js";
import { speak } from "../utils/tts.js";

export const PASS = 0.8; // tỉ lệ từ khớp coi là đạt

export default function SpeakCheck({ target, prompt, footer, autoHint = false }) {
  const [result, setResult] = useState(null); // { text, diff, score }

  const onResult = useCallback(
    (text) => {
      const diff = diffWords(target, text);
      const ok = diff.filter((d) => d.ok).length;
      setResult({ text, diff, score: diff.length ? ok / diff.length : 0 });
    },
    [target]
  );

  const rec = useRecorder(onResult);
  const retry = () => {
    setResult(null);
    rec.reset();
  };

  const passed = result && result.score >= PASS;

  return (
    <>
      {prompt}

      {!result && (
        <>
          {rec.phase === "error" && (
            <div className="err">
              {rec.error}
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-sm" onClick={rec.reset}>Thử lại</button>
              </div>
            </div>
          )}
          {rec.phase === "thinking" && <p className="muted center pulse">Đang nghe bạn nói…</p>}
          {rec.phase === "recording" ? (
            <button className="btn btn-rec" onClick={rec.stop}>■ Dừng — tôi nói xong rồi</button>
          ) : (
            rec.phase !== "thinking" && (
              <button className="btn btn-primary" onClick={rec.start}>🎙️ Nói câu này</button>
            )
          )}
          {autoHint && (
            <button className="btn-link" onClick={() => speak(target)}>Nghe mẫu trước</button>
          )}
        </>
      )}

      {result && (
        <>
          <div className="card">
            <div className={`verdict ${passed ? "verdict-ok" : "verdict-bad"}`}>
              {passed ? "✓ Khớp — nói tốt" : "Gần đúng — xem chỗ lệch"}
            </div>
            <p className="heard" style={{ marginBottom: 6 }}>
              {result.diff.map((d, i) => (
                <span key={i} className={d.ok ? "w-ok" : "w-bad"}>
                  {d.word}{" "}
                </span>
              ))}
            </p>
            <p className="muted small" style={{ margin: 0 }}>Whisper nghe được: “{result.text || "(không rõ)"}”</p>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={() => speak(target)}>🔊 Nghe mẫu</button>
            <button className="btn" onClick={retry}>↻ Nói lại</button>
          </div>

          {footer?.(result)}
        </>
      )}
    </>
  );
}
