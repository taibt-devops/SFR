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
import TtsControls from "./TtsControls.jsx";
import { speak } from "../utils/tts.js";
import { useShadow } from "../hooks/useShadow.js";
import { loadSpeaking, speakingProfile } from "../srs/speaking.js";
import { loadCoachNotes, saveCoachNotes, addCoachNote, priorFocusText } from "../srs/coachMemory.js";
import { pickScenario } from "../data/scenarios.js";

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

// Recast (tổng kết buổi): câu học viên nói → bản bản-xứ. Nghe mẫu + đọc theo lại chính câu của mình.
function UpgradeItem({ u }) {
  const { phase, result, error, start, stop } = useShadow();
  return (
    <div className="story-text" style={{ fontSize: 14, marginTop: 10, padding: "12px 14px" }}>
      <div className="app-sub">Bạn nói: “{u.orig}”</div>
      <div style={{ marginTop: 6, color: "var(--teal)", fontWeight: 600 }}>→ {u.better}</div>
      <div style={{ marginTop: 8 }}>
        <button className="link-exit" onClick={() => speak(u.better)}>🔊 Nghe</button>
        {phase === "recording" ? (
          <button className="link-exit" style={{ marginLeft: 12, color: "var(--red)" }} onClick={stop}>■ Dừng</button>
        ) : (
          <button className="link-exit" style={{ marginLeft: 12 }} disabled={phase === "thinking"} onClick={() => start(u.better)}>
            {phase === "thinking" ? "Đang nghe…" : "🎯 Đọc theo"}
          </button>
        )}
      </div>
      {error && <p className="app-sub" style={{ color: "var(--red)", marginTop: 6 }}>{error}</p>}
      {result && (
        <p className="app-sub" style={{ marginTop: 6 }}>
          {result.result.map((x, i) => (
            <span key={i} style={{ color: x.ok ? "var(--green)" : "var(--red)" }}>{x.word} </span>
          ))}
        </p>
      )}
    </div>
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

export default function VoiceChat({ dueWords, addWord, level: levelProp, topic: topicProp, roleplay = false, onBack }) {
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [error, setError] = useState("");
  const [spoken, setSpoken] = useState(() => new Set()); // từ due đã nói (B16)
  const [shadow, setShadow] = useState(null); // {target, result:[{word,ok}], heard} (B17)
  const [saving, setSaving] = useState(null); // {sentence, word} (B18)
  const [level] = useState(levelProp || "A2"); // trình độ lấy từ trang chủ
  const [topic, setTopic] = useState(() => topicProp || pickTopic()); // chủ đề lấy từ trang chủ (hoặc tự xoay nếu "Tất cả")
  const [scn, setScn] = useState(() => (roleplay ? pickScenario() : null)); // tình huống đóng vai (#4)
  const [summary, setSummary] = useState(null); // tổng kết cuối phiên
  const [lookup, setLookup] = useState(null); // tra nghĩa: {term, vi, loading}
  const focus = useMemo(buildFocus, []); // điểm cần tập trung (từ hồ sơ)

  // Tra nghĩa 1 từ (hoặc cả câu) theo ngữ cảnh. Giữ ctx để nút "＋ Thêm" điền sẵn câu ví dụ.
  const lookupTerm = useCallback((raw, context) => {
    const term = String(raw).replace(/[^A-Za-z'\- ]/g, "").trim();
    if (!term) return;
    const ctx = context || term;
    setLookup({ term, ctx, loading: true });
    translateWord(term, ctx)
      .then((vi) => setLookup({ term, ctx, vi }))
      .catch((e) => setLookup({ term, ctx, vi: "(lỗi: " + String(e.message || e) + ")", err: true }));
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
    // Trí nhớ liên buổi: nhắc điểm cần luyện (điểm yếu hồ sơ + toImprove buổi trước).
    const recall = [focus, priorFocusText(loadCoachNotes())].filter(Boolean).join(" · ");
    reply([], dueWords, { level, focus, topic, opener: true, recall, scenario: scn })
      .then((t) => { setHistory([{ role: "assistant", content: t }]); setPhase("idle"); })
      .catch((e) => { setError("Không lấy được câu mở đầu: " + String(e.message || e)); setPhase("error"); });
  }, [dueWords, level, focus, topic, scn]);

  async function processTurn(blob) {
    setPhase("thinking");
    try {
      const said = await transcribe(blob);
      if (!said) { setError("Không nghe rõ — thử nói lại."); setPhase("error"); return; }
      const hit = matchSpoken(said, dueWords); // B16
      if (hit.length) setSpoken((s) => new Set([...s, ...hit]));
      const next = [...history, { role: "user", content: said }];
      setHistory(next);
      const answer = await reply(next, dueWords, { level, focus, topic, scenario: scn });
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
    // Lưu vào ĐÚNG chủ đề đang luyện (topicProp). Chỉ khi không xác định được mới gom "Sổ lỗi".
    const c = (topicProp && topicProp.trim()) || "Sổ lỗi (luyện nói)";
    const r = addWord({ c, v: saving.word.trim(), m: (saving.m || "").trim(), e: saving.sentence, d: "", col: "" });
    setSaving(null);
    setError(r.ok ? "" : r.error || "Lưu lỗi");
  }

  // Tự dịch nghĩa cho từ đang nhập trong popup (theo ngữ cảnh câu ví dụ nếu có).
  function autoMeaning() {
    const w = saving?.word.trim();
    if (!w) return;
    setSaving((s) => ({ ...s, mLoading: true }));
    translateWord(w, saving.sentence || w)
      .then((vi) => setSaving((s) => (s ? { ...s, m: vi, mLoading: false } : s)))
      .catch(() => setSaving((s) => (s ? { ...s, mLoading: false } : s)));
  }

  function endSession() {
    setPhase("thinking");
    setError("");
    summarize({ history, level, topic: scn ? scn.title : topic, scenario: scn })
      .then((s) => {
        setSummary(s);
        // Lưu tổng kết → trí nhớ gia sư (mở đầu buổi sau nhắc lại + "bài tập buổi sau" ở trang chủ).
        saveCoachNotes(addCoachNote(loadCoachNotes(), { at: Date.now(), topic: scn ? scn.title : topic, level, ...s }));
        setPhase("idle");
      })
      .catch((e) => { setError("Không tổng kết được: " + String(e.message || e)); setPhase("error"); });
  }
  function newSession() {
    setHistory([]); setSpoken(new Set()); setShadow(null); setSummary(null); setError("");
    setTopic(topicProp || pickTopic()); if (roleplay) setScn(pickScenario(scn?.id)); setPhase("idle");
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
          <button className="btn-back" onClick={onBack}>← Về</button>
        </div>

        {/* Roleplay: đạt mục tiêu tình huống chưa */}
        {scn && summary.goalDone !== undefined && (
          <div className="carry-note" style={{ marginTop: 14, ...(summary.goalDone ? {} : { borderColor: "rgba(251,191,36,.4)", background: "rgba(251,191,36,.08)" }) }}>
            <div className="carry-head" style={summary.goalDone ? {} : { color: "var(--amber)" }}>
              🎭 {scn.title} — {summary.goalDone ? "✅ Đạt mục tiêu" : "⏳ Chưa đạt mục tiêu"}
            </div>
            {summary.goalNote && <div className="carry-sub">{summary.goalNote}</div>}
          </div>
        )}

        <div className="sec-lab" style={{ marginTop: 14 }}>Từ đang ôn đã dùng ({spoken.size}/{dueWords.length})</div>
        <div className="chips">
          {dueWords.length === 0 && <span className="app-sub">—</span>}
          {dueWords.map((w) => (
            <span key={w} className={`chip ${spoken.has(w) ? "chip-on" : ""}`}>{spoken.has(w) ? "✓ " : ""}{w}</span>
          ))}
        </div>

        <SumSection title="✅ Làm tốt" items={summary.wentWell} color="var(--green)" />
        <SumSection title="🔧 Cần luyện" items={summary.toImprove} color="var(--amber)" />

        {/* Recast: nghe bản nâng cấp rồi đọc theo — sửa đúng câu MÌNH vừa nói */}
        {summary.upgrades?.length > 0 && (
          <>
            <div className="sec-lab" style={{ color: "var(--blue)" }}>⬆️ Câu của bạn → cách nói tự nhiên hơn</div>
            {summary.upgrades.map((u, i) => <UpgradeItem key={i} u={u} />)}
          </>
        )}
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
        <span className="app-title">{scn ? "🎭 Đóng vai" : "Luyện nói"}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          {/* Góc phải: mở popup thêm từ vựng (tự điền câu gần nhất của gia sư làm ví dụ) */}
          <button
            className="pill-add"
            title="Thêm từ vựng vào deck"
            onClick={() => setSaving({
              sentence: [...history].reverse().find((m) => m.role === "assistant")?.content || "",
              word: "",
            })}
          >＋ Từ vựng</button>
          {started && <button className="link-exit" style={{ color: "var(--teal)" }} onClick={endSession}>Kết thúc</button>}
          <button className="btn-back" onClick={onBack}>← Về</button>
        </span>
      </div>
      <ContextBar label={scn ? scn.title : topic} level={level} />
      {/* Thẻ tình huống: vai của bạn + mục tiêu; đổi được khi CHƯA bắt đầu */}
      {scn && (
        <div className="carry-note" style={{ marginTop: 10 }}>
          <div className="carry-head">🎭 {scn.title}</div>
          <div className="carry-sub">Bạn là <b>{scn.userRole}</b> · đối phương: {scn.aiRole}</div>
          <div className="carry-sub">🎯 Nhiệm vụ: {scn.goal}</div>
          {!started && history.length === 0 && (
            <button className="link-exit" style={{ marginTop: 6, color: "var(--teal)" }} onClick={() => setScn(pickScenario(scn.id))}>
              🎲 Đổi tình huống
            </button>
          )}
        </div>
      )}
      {!scn && focus && <p className="app-sub" style={{ marginTop: 6 }}>🎯 Luyện trúng: {focus}</p>}
      <TtsControls />

      {/* B16: checklist từ due đã nói */}
      <div className="chips" style={{ marginTop: 10 }}>
        {dueWords.length === 0 && <span className="app-sub">Không có từ due.</span>}
        {dueWords.map((w) => (
          <span key={w} className={`chip ${spoken.has(w) ? "chip-on" : ""}`}>{spoken.has(w) ? "✓ " : ""}{w}</span>
        ))}
      </div>

      <div className="chat-log" ref={logRef}>
        {history.length === 0 && phase !== "thinking" && (
          <p className="empty-msg">{scn ? "Đọc nhiệm vụ ở trên rồi bấm “Bắt đầu buổi nói” — đối phương sẽ mở lời trước." : "Chọn trình độ & chủ đề ở trên, rồi bấm “Bắt đầu buổi nói”."}</p>
        )}
        {history.map((m, i) => (
          <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
            <Clickable text={m.content} onWord={(w) => lookupTerm(w, m.content)} />
            {m.role === "assistant" && (
              <span style={{ display: "block", marginTop: 4 }}>
                <button className="link-exit" onClick={() => speak(m.content)}>🔊</button>
                <button className="link-exit" style={{ marginLeft: 10 }} onClick={() => lookupTerm(m.content, m.content)}>🌐 Dịch câu</button>
                <button className="link-exit" style={{ marginLeft: 10 }} onClick={() => startRecording({ type: "shadow", target: m.content })}>🎯 Đọc theo</button>
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

      {/* B18: popup lưu thành thẻ (mở từ icon nổi góc phải) */}
      {saving && (
        <div className="modal-overlay" onClick={() => setSaving(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sec-lab" style={{ margin: "0 0 9px" }}>＋ Thêm từ vựng</div>
            <input className="field" autoFocus placeholder="từ/cụm muốn lưu…" value={saving.word}
              onChange={(e) => setSaving({ ...saving, word: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && saveCard()} />
            <div className="field-wrap" style={{ marginTop: 8 }}>
              <input className="field" placeholder="nghĩa tiếng Việt…" value={saving.m || ""}
                onChange={(e) => setSaving({ ...saving, m: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && saveCard()} />
              <button className="link-exit" title="Tự dịch nghĩa" disabled={!saving.word.trim() || saving.mLoading}
                style={{ fontSize: 18, flexShrink: 0 }} onClick={autoMeaning}>
                {saving.mLoading ? "…" : "🌐"}
              </button>
            </div>
            <textarea className="field" rows={2} placeholder="câu ví dụ (tuỳ chọn)…" value={saving.sentence}
              style={{ marginTop: 8 }}
              onChange={(e) => setSaving({ ...saving, sentence: e.target.value })} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="cta-ghost" style={{ marginTop: 0 }} disabled={!saving.word.trim()} onClick={saveCard}>Lưu</button>
              <button className="cta-ghost" style={{ marginTop: 0 }} onClick={() => setSaving(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {phase === "error" && <p className="empty-msg" style={{ color: "var(--red)" }}>{error}</p>}

      {/* Tra nghĩa nhanh (chạm từ trong câu / Dịch câu) */}
      {lookup && (
        <div className="lookup-pop">
          <span><b style={{ color: "var(--teal)" }}>{lookup.term}</b> {lookup.loading ? "— đang dịch…" : "— " + lookup.vi}</span>
          {/* Thêm từ vừa tra vào từ vựng của chủ đề: mở popup điền sẵn từ + nghĩa + câu ngữ cảnh */}
          {!lookup.loading && !lookup.err && (
            <button className="link-exit" style={{ color: "var(--teal)", flexShrink: 0, fontWeight: 700 }}
              onClick={() => {
                setSaving({ word: lookup.term, m: lookup.vi, sentence: lookup.ctx === lookup.term ? "" : lookup.ctx });
                setLookup(null);
              }}>＋ Thêm</button>
          )}
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
