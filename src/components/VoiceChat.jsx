// Luyện nói (M6 + M11): mic → Whisper → Claude → TTS. Nút bấm kích hoạt mic trong cú chạm (iOS).
// M11: B16 đối chiếu từ due đã nói · B17 "Đọc theo" + diff phát âm · B18 lưu lỗi/câu thành thẻ.
// Cờ "spoken" là tín hiệu mềm — KHÔNG đụng SM-2.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reply } from "../ai/chat.js";
import { summarize } from "../ai/summary.js";
import { translateWord } from "../ai/translate.js";
import { transcribe } from "../ai/whisper.js";
import { matchSpoken, diffWords } from "../utils/voiceMatch.js";
import ContextBar from "./ContextBar.jsx";
import { loadSpeaking, speakingProfile } from "../srs/speaking.js";

const TOPICS = [
  "Giới thiệu bản thân & sở thích",
  "Một ngày thường của bạn",
  "Món ăn / quán bạn thích",
  "Kế hoạch cuối tuần",
  "Một chuyến đi đáng nhớ",
  "Công việc hoặc việc học của bạn",
  "Phim/bài hát thích gần đây",
  "Quan điểm: làm việc ở nhà",
];
const pickTopic = () => TOPICS[Math.floor(Math.random() * TOPICS.length)];
const DIM_VI = { fluency: "trôi chảy", lexical: "vốn từ", grammar: "ngữ pháp", pronunciation: "phát âm" };

// Mô tả điểm cần tập trung (từ hồ sơ nói) để gia sư lái hội thoại trúng chỗ yếu.
function buildFocus() {
  const p = speakingProfile(loadSpeaking());
  if (!p) return "";
  const parts = [];
  if (p.weakestDim) parts.push(DIM_VI[p.weakestDim] + " (trục yếu)");
  if (p.topTags?.length) parts.push("lỗi hay lặp: " + p.topTags.slice(0, 2).map((t) => t.tag).join(", "));
  return parts.join(" · ");
}

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

// Hiện nội dung bong bóng: mỗi từ chạm được để tra nghĩa.
function Clickable({ text, onWord }) {
  return text.split(/(\s+)/).map((tok, i) =>
    /[A-Za-z]/.test(tok) ? (
      <span key={i} className="lookup-word" onClick={() => onWord(tok)}>{tok}</span>
    ) : (
      <span key={i}>{tok}</span>
    )
  );
}

function SumSection({ title, items, color }) {
  if (!items || !items.length) return null;
  return (
    <>
      <div className="sec-lab" style={{ color }}>{title}</div>
      <ul className="assess-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </>
  );
}

export default function VoiceChat({ dueWords, addWord, level: levelProp, topic: topicProp, onBack }) {
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [error, setError] = useState("");
  const [spoken, setSpoken] = useState(() => new Set()); // từ due đã nói (B16)
  const [shadow, setShadow] = useState(null); // {target, result:[{word,ok}], heard} (B17)
  const [saving, setSaving] = useState(null); // {sentence, word} (B18)
  const [level] = useState(levelProp || "A2"); // trình độ lấy từ trang chủ
  const [topic, setTopic] = useState(() => topicProp || pickTopic()); // chủ đề lấy từ trang chủ (hoặc tự xoay nếu "Tất cả")
  const [summary, setSummary] = useState(null); // tổng kết cuối phiên
  const [lookup, setLookup] = useState(null); // tra nghĩa: {term, vi, loading}
  const focus = useMemo(buildFocus, []); // điểm cần tập trung (từ hồ sơ)

  // Tra nghĩa 1 từ (hoặc cả câu) theo ngữ cảnh.
  const lookupTerm = useCallback((raw, context) => {
    const term = String(raw).replace(/[^A-Za-z'\- ]/g, "").trim();
    if (!term) return;
    setLookup({ term, loading: true });
    translateWord(term, context || term)
      .then((vi) => setLookup({ term, vi }))
      .catch((e) => setLookup({ term, vi: "(lỗi: " + String(e.message || e) + ")" }));
  }, []);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const modeRef = useRef({ type: "turn" });
  const logRef = useRef(null);

  // Tự cuộn khung hội thoại xuống cuối khi có tin mới / đang nghĩ (tránh tin trôi khỏi màn hình).
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, phase]);

  const started = history.some((m) => m.role === "user"); // đã nói lượt nào chưa

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => { stopTracks(); try { speechSynthesis.cancel(); } catch {} }, [stopTracks]);

  // App MỞ LỜI khi NGƯỜI DÙNG bấm "Bắt đầu" (sau khi đã chọn trình độ & chủ đề) — KHÔNG tự chạy lúc vào.
  const begin = useCallback(() => {
    setPhase("thinking");
    setError("");
    reply([], dueWords, { level, focus, topic, opener: true })
      .then((t) => { setHistory([{ role: "assistant", content: t }]); setPhase("idle"); })
      .catch((e) => { setError("Không lấy được câu mở đầu: " + String(e.message || e)); setPhase("error"); });
  }, [dueWords, level, focus, topic]);

  async function processTurn(blob) {
    setPhase("thinking");
    try {
      const said = await transcribe(blob);
      if (!said) { setError("Không nghe rõ — thử nói lại."); setPhase("error"); return; }
      const hit = matchSpoken(said, dueWords); // B16
      if (hit.length) setSpoken((s) => new Set([...s, ...hit]));
      const next = [...history, { role: "user", content: said }];
      setHistory(next);
      const answer = await reply(next, dueWords, { level, focus, topic });
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

  function endSession() {
    setPhase("thinking");
    setError("");
    summarize({ history, level, topic })
      .then((s) => { setSummary(s); setPhase("idle"); })
      .catch((e) => { setError("Không tổng kết được: " + String(e.message || e)); setPhase("error"); });
  }
  function newSession() {
    setHistory([]); setSpoken(new Set()); setShadow(null); setSummary(null); setError("");
    setTopic(topicProp || pickTopic()); setPhase("idle");
  }
  // Bỏ lượt vừa rồi (câu đáp của app + lời mình nói) để thu lại — khi Whisper nghe nhầm.
  function redoLast() {
    setHistory((h) => {
      const out = [...h];
      if (out.length && out[out.length - 1].role === "assistant") out.pop();
      if (out.length && out[out.length - 1].role === "user") out.pop();
      return out;
    });
    setError("");
  }

  const busy = phase === "thinking";
  const shadowing = phase === "recording" && modeRef.current.type === "shadow";

  // ── Màn tổng kết cuối phiên ──
  if (summary) {
    return (
      <div className="app">
        <div className="study-top">
          <span className="app-title">Tổng kết buổi nói</span>
          <button className="link-exit" onClick={onBack}>← Về</button>
        </div>

        <div className="sec-lab" style={{ marginTop: 14 }}>Từ đang ôn đã dùng ({spoken.size}/{dueWords.length})</div>
        <div className="chips">
          {dueWords.length === 0 && <span className="app-sub">—</span>}
          {dueWords.map((w) => (
            <span key={w} className={`chip ${spoken.has(w) ? "chip-on" : ""}`}>{spoken.has(w) ? "✓ " : ""}{w}</span>
          ))}
        </div>

        <SumSection title="✅ Làm tốt" items={summary.wentWell} color="var(--green)" />
        <SumSection title="🔧 Cần luyện" items={summary.toImprove} color="var(--amber)" />
        {summary.suggestion && (
          <p className="empty-msg" style={{ marginTop: 18, textAlign: "left", color: "var(--text)" }}>
            💡 <b>Buổi sau:</b> {summary.suggestion}
          </p>
        )}

        <div className="spacer" />
        <button className="cta" onClick={newSession}><span className="cta-main">Buổi mới</span></button>
        <button className="cta-ghost" onClick={onBack}>Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Luyện nói</span>
        <span>
          {started && <button className="link-exit" style={{ marginRight: 14, color: "var(--teal)" }} onClick={endSession}>Kết thúc</button>}
          <button className="link-exit" onClick={onBack}>← Về</button>
        </span>
      </div>
      <ContextBar label={topic} level={level} />
      {focus && <p className="app-sub" style={{ marginTop: 6 }}>🎯 Luyện trúng: {focus}</p>}

      {/* B16: checklist từ due đã nói */}
      <div className="chips" style={{ marginTop: 10 }}>
        {dueWords.length === 0 && <span className="app-sub">Không có từ due.</span>}
        {dueWords.map((w) => (
          <span key={w} className={`chip ${spoken.has(w) ? "chip-on" : ""}`}>{spoken.has(w) ? "✓ " : ""}{w}</span>
        ))}
      </div>

      <div className="chat-log" ref={logRef}>
        {history.length === 0 && phase !== "thinking" && <p className="empty-msg">Chọn trình độ & chủ đề ở trên, rồi bấm “Bắt đầu buổi nói”.</p>}
        {history.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
            <Clickable text={m.content} onWord={(w) => lookupTerm(w, m.content)} />
            {m.role === "assistant" && (
              <span style={{ display: "block", marginTop: 4 }}>
                <button className="link-exit" onClick={() => speak(m.content)}>🔊</button>
                <button className="link-exit" style={{ marginLeft: 10 }} onClick={() => lookupTerm(m.content, m.content)}>🌐 Dịch câu</button>
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

      {/* Tra nghĩa nhanh (chạm từ trong câu / Dịch câu) */}
      {lookup && (
        <div className="lookup-pop">
          <span><b style={{ color: "var(--teal)" }}>{lookup.term}</b> {lookup.loading ? "— đang dịch…" : "— " + lookup.vi}</span>
          <button className="link-exit" onClick={() => setLookup(null)}>✕</button>
        </div>
      )}

      <div className="spacer" />

      {shadowing && <p className="app-sub" style={{ textAlign: "center" }}>Đang đọc theo… bấm Dừng khi xong.</p>}
      {phase === "recording" ? (
        <button className="cta" style={{ background: "var(--red)" }} onClick={stopRecording}>
          <span className="cta-main">■ Dừng & gửi</span>
        </button>
      ) : history.length === 0 ? (
        <button className="cta" disabled={busy} onClick={begin}>
          <span className="cta-main">🎤 {busy ? "Đang mở lời…" : "Bắt đầu buổi nói"}</span>
        </button>
      ) : (
        <button className="cta" disabled={busy} onClick={() => startRecording({ type: "turn" })}>
          <span className="cta-main">🎤 {started ? "Nói tiếp" : "Trả lời"}</span>
        </button>
      )}
      {started && phase === "idle" && (
        <button className="cta-ghost" onClick={redoLast}>↺ Nói lại lượt vừa rồi</button>
      )}
    </div>
  );
}
