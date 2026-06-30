// Luyện nói (M6 + M11): mic → Whisper → Claude → TTS. Nút bấm kích hoạt mic trong cú chạm (iOS).
// M11: B16 đối chiếu từ due đã nói · B17 "Đọc theo" + diff phát âm · B18 lưu lỗi/câu thành thẻ.
// Cờ "spoken" là tín hiệu mềm — KHÔNG đụng SM-2.
import { useCallback, useEffect, useRef, useState } from "react";
import { reply } from "../ai/chat.js";
import { transcribe } from "../ai/whisper.js";
import { matchSpoken, diffWords } from "../utils/voiceMatch.js";

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

export default function VoiceChat({ dueWords, addWord, onBack }) {
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [error, setError] = useState("");
  const [spoken, setSpoken] = useState(() => new Set()); // từ due đã nói (B16)
  const [shadow, setShadow] = useState(null); // {target, result:[{word,ok}], heard} (B17)
  const [saving, setSaving] = useState(null); // {sentence, word} (B18)

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const modeRef = useRef({ type: "turn" });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => { stopTracks(); try { speechSynthesis.cancel(); } catch {} }, [stopTracks]);

  async function processTurn(blob) {
    setPhase("thinking");
    try {
      const said = await transcribe(blob);
      if (!said) { setError("Không nghe rõ — thử nói lại."); setPhase("error"); return; }
      const hit = matchSpoken(said, dueWords); // B16
      if (hit.length) setSpoken((s) => new Set([...s, ...hit]));
      const next = [...history, { role: "user", content: said }];
      setHistory(next);
      const answer = await reply(next, dueWords);
      setHistory([...next, { role: "assistant", content: answer }]);
      speak(answer);
      setPhase("idle");
    } catch (e) {
      setError(String(e.message || e)); setPhase("error");
    }
  }

  async function processShadow(blob, target) {
    setPhase("thinking");
    try {
      const heard = await transcribe(blob);
      setShadow({ target, heard, result: diffWords(target, heard) }); // B17
      setPhase("idle");
    } catch (e) {
      setError(String(e.message || e)); setPhase("error");
    }
  }

  async function startRecording(mode) {
    setError("");
    modeRef.current = mode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        modeRef.current.type === "shadow" ? processShadow(blob, modeRef.current.target) : processTurn(blob);
      };
      recRef.current = rec;
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Không mở được mic: " + String(e.message || e)); setPhase("error");
    }
  }
  function stopRecording() {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  function saveCard() {
    if (!saving?.word.trim()) return;
    const r = addWord({ c: "Sổ lỗi (luyện nói)", v: saving.word.trim(), m: "", e: saving.sentence, d: "", col: "" });
    setSaving(null);
    setError(r.ok ? "" : r.error || "Lưu lỗi");
  }

  const busy = phase === "thinking";
  const shadowing = phase === "recording" && modeRef.current.type === "shadow";

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Luyện nói</span>
        <button className="link-exit" onClick={onBack}>← Về</button>
      </div>

      {/* B16: checklist từ due đã nói */}
      <div className="chips" style={{ marginTop: 10 }}>
        {dueWords.length === 0 && <span className="app-sub">Không có từ due.</span>}
        {dueWords.map((w) => (
          <span key={w} className={`chip ${spoken.has(w) ? "chip-on" : ""}`}>{spoken.has(w) ? "✓ " : ""}{w}</span>
        ))}
      </div>

      <div className="chat-log">
        {history.length === 0 && <p className="empty-msg">Bấm nút bên dưới và nói một câu tiếng Anh để bắt đầu.</p>}
        {history.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
            {m.content}
            {m.role === "assistant" && (
              <span style={{ display: "block", marginTop: 4 }}>
                <button className="link-exit" onClick={() => speak(m.content)}>🔊</button>
                <button className="link-exit" style={{ marginLeft: 10 }} onClick={() => startRecording({ type: "shadow", target: m.content })}>🎯 Đọc theo</button>
                <button className="link-exit" style={{ marginLeft: 10 }} onClick={() => setSaving({ sentence: m.content, word: "" })}>＋ Thẻ</button>
              </span>
            )}
          </div>
        ))}
        {busy && <p className="empty-msg">Đang nghĩ…</p>}
      </div>

      {/* B17: kết quả đọc theo */}
      {shadow && (
        <div className="story-text" style={{ fontSize: 15 }}>
          <div className="app-sub" style={{ marginBottom: 6 }}>Đọc theo — từ đỏ là chưa khớp:</div>
          {shadow.result.map((x, i) => (
            <span key={i} style={{ color: x.ok ? "var(--green)" : "var(--red)" }}>{x.word} </span>
          ))}
        </div>
      )}

      {/* B18: lưu thành thẻ */}
      {saving && (
        <div className="story-text" style={{ fontSize: 14 }}>
          <div className="app-sub" style={{ marginBottom: 6 }}>Lưu thành thẻ (ví dụ: “{saving.sentence}”)</div>
          <input className="field" autoFocus placeholder="từ/cụm muốn lưu…" value={saving.word}
            onChange={(e) => setSaving({ ...saving, word: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && saveCard()} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="cta-ghost" style={{ marginTop: 0 }} disabled={!saving.word.trim()} onClick={saveCard}>Lưu</button>
            <button className="cta-ghost" style={{ marginTop: 0 }} onClick={() => setSaving(null)}>Huỷ</button>
          </div>
        </div>
      )}

      {phase === "error" && <p className="empty-msg" style={{ color: "var(--red)" }}>{error}</p>}

      <div className="spacer" />

      {shadowing && <p className="app-sub" style={{ textAlign: "center" }}>Đang đọc theo… bấm Dừng khi xong.</p>}
      {phase === "recording" ? (
        <button className="cta" style={{ background: "var(--red)" }} onClick={stopRecording}>
          <span className="cta-main">■ Dừng & gửi</span>
        </button>
      ) : (
        <button className="cta" disabled={busy} onClick={() => startRecording({ type: "turn" })}>
          <span className="cta-main">🎤 {history.length ? "Nói tiếp" : "Bắt đầu nói"}</span>
        </button>
      )}
    </div>
  );
}
