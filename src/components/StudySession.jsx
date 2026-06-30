// Màn ôn đa kiểu (§5.1–5.2): recall / cloze / listen / produce / reverse.
// Phase: "prompt" (hỏi) → "revealed" (lộ đáp án + 4 nút). Auto-chấm cloze/listen chỉ GỢI Ý q.
// Thuần UI — logic chọn kiểu/sinh cloze/so khớp ở srs/cardTypes.js; SM-2 không đổi.
import { useCallback, useEffect, useMemo, useState } from "react";
import RatingBar from "./RatingBar.jsx";
import { coachSentence } from "../ai/coach.js";
import {
  makeCloze,
  checkAnswer,
  suggestedQ,
  availableTypes,
  pickType,
  isAutoGraded,
} from "../srs/cardTypes.js";

const KEY_TO_Q = { 1: 2, 2: 3, 3: 4, 4: 5 };

function speak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  } catch {
    /* trình duyệt không hỗ trợ TTS — bỏ qua */
  }
}

function Back({ card }) {
  const cols = (card.col || "").split(" · ").map((s) => s.trim()).filter(Boolean);
  return (
    <>
      <div className="fc-verb">{card.v}</div>
      <div className="fc-mean">{card.m}</div>
      <div className="fc-div" />
      <div className="fc-en">“{card.e}”</div>
      <div className="fc-vi">→ {card.d}</div>
      {cols.length > 0 && (
        <div className="fc-cols">{cols.map((c, i) => <span key={i} className="fc-col">{c}</span>)}</div>
      )}
    </>
  );
}

export default function StudySession({ card, state, progress, productionMode, onRate, onExit }) {
  const cloze = useMemo(() => makeCloze(card), [card]);
  const seed = progress.current + (card.v?.length || 0);
  const type = useMemo(() => {
    if (productionMode) {
      const prod = availableTypes(card).filter((t) => t === "produce" || t === "reverse");
      if (prod.length) return prod[seed % prod.length];
    }
    return pickType(card, seed);
  }, [card, productionMode, seed]);

  const [phase, setPhase] = useState("prompt"); // "prompt" | "revealed"
  const [answer, setAnswer] = useState("");
  const [graded, setGraded] = useState(null); // {correct} cho kiểu auto
  const [feedback, setFeedback] = useState(null); // nhận xét coach cho produce/reverse
  const [coaching, setCoaching] = useState(false);

  // reset khi đổi thẻ HOẶC đổi kiểu (thẻ lapsed quay lại có thể đổi kiểu)
  useEffect(() => {
    setPhase("prompt");
    setAnswer("");
    setGraded(null);
    setFeedback(null);
    setCoaching(false);
  }, [card, type]);

  const checkSentence = useCallback(async () => {
    if (!answer.trim()) return;
    setCoaching(true);
    setFeedback(null);
    try {
      const fb = await coachSentence({
        word: card.v,
        meaning: card.m,
        sentence: answer,
        hintVi: type === "reverse" ? card.d : "",
      });
      setFeedback(fb);
    } catch (e) {
      setFeedback("Không lấy được nhận xét: " + String(e.message || e));
    } finally {
      setCoaching(false);
    }
  }, [answer, card, type]);

  const expected = type === "cloze" ? cloze?.answer : type === "listen" ? card.v : null;

  const reveal = useCallback(() => {
    if (isAutoGraded(type)) setGraded({ correct: checkAnswer(answer, expected) });
    setPhase("revealed");
  }, [type, answer, expected]);

  useEffect(() => {
    function onKey(e) {
      if (phase === "revealed") {
        if (KEY_TO_Q[e.key]) onRate(KEY_TO_Q[e.key]);
      } else if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        reveal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, reveal, onRate]);

  const sQ = graded ? suggestedQ(graded.correct) : null;
  const pct = progress.total ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="app">
      <div className="study-top">
        <span className="cat-tag"><i className="dot" /> {card.c}</span>
        <span className="prog-txt">
          {Math.min(progress.current + 1, progress.total)} / {progress.total}
          <button className="link-exit" style={{ marginLeft: 12 }} onClick={onExit}>Thoát</button>
        </span>
      </div>
      <div className="pbar"><i style={{ width: `${pct}%` }} /></div>

      <div className="flashcard" onClick={phase === "prompt" && type === "recall" ? reveal : undefined}>
        {phase === "revealed" ? (
          <>
            {graded && (
              <div className="fc-hint" style={{ color: graded.correct ? "var(--green)" : "var(--red)" }}>
                {graded.correct ? "✓ Chính xác" : `✗ Chưa đúng · đáp án: ${expected}`}
              </div>
            )}
            <Back card={card} />
            {(type === "produce" || type === "reverse") && answer.trim() && (
              <div className="fc-vi" style={{ marginTop: 12, opacity: 0.85 }}>Câu của bạn: “{answer.trim()}”</div>
            )}
          </>
        ) : (
          <PromptFace type={type} card={card} cloze={cloze} answer={answer} setAnswer={setAnswer} onSpeak={() => speak(card.v)} onSubmit={reveal} />
        )}
      </div>

      {/* cloze/listen: tự chấm khi bấm Kiểm tra */}
      {phase === "prompt" && isAutoGraded(type) && (
        <button className="cta" style={{ marginTop: 14 }} onClick={reveal}>
          <span className="cta-main">Kiểm tra</span>
        </button>
      )}

      {/* produce/reverse: nhận xét câu (lặp được) rồi mới hiện đáp án */}
      {phase === "prompt" && (type === "produce" || type === "reverse") && (
        <>
          {coaching && <p className="empty-msg" style={{ marginTop: 12 }}>Đang nhận xét…</p>}
          {feedback && <div className="story-text" style={{ fontSize: 14, marginTop: 12 }}>{feedback}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="cta-ghost" style={{ marginTop: 0 }} disabled={!answer.trim() || coaching} onClick={checkSentence}>
              {feedback ? "Kiểm tra lại" : "Kiểm tra câu"}
            </button>
            <button className="cta-ghost" style={{ marginTop: 0 }} onClick={reveal}>Hiện đáp án</button>
          </div>
        </>
      )}

      {phase === "revealed" && <RatingBar state={state} onRate={onRate} suggestedQ={sQ} />}
    </div>
  );
}

function PromptFace({ type, card, cloze, answer, setAnswer, onSpeak, onSubmit }) {
  const onEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } };
  if (type === "cloze") {
    return (
      <>
        <div className="fc-hint">Điền từ còn thiếu</div>
        <div className="fc-en" style={{ fontSize: 16 }}>{cloze.text}</div>
        <input className="field" style={{ marginTop: 16 }} autoFocus placeholder="từ còn thiếu…" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={onEnter} />
      </>
    );
  }
  if (type === "listen") {
    return (
      <>
        <div className="fc-hint">Nghe và gõ lại từ</div>
        <button className="cta-ghost" style={{ marginTop: 0, width: "auto", padding: "10px 20px" }} onClick={onSpeak}>🔊 Nghe</button>
        <input className="field" style={{ marginTop: 14 }} autoFocus placeholder="gõ từ bạn nghe…" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={onEnter} />
      </>
    );
  }
  if (type === "reverse") {
    return (
      <>
        <div className="fc-hint">Dịch sang tiếng Anh (nói/viết)</div>
        <div className="fc-vi" style={{ fontSize: 15, color: "var(--text)" }}>{card.d}</div>
        <textarea className="field" rows={2} style={{ marginTop: 14 }} autoFocus placeholder="câu tiếng Anh của bạn…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </>
    );
  }
  if (type === "produce") {
    return (
      <>
        <div className="fc-verb">{card.v}</div>
        <div className="fc-hint" style={{ marginTop: 12 }}>Đặt một câu dùng từ này</div>
        <textarea className="field" rows={2} style={{ marginTop: 10 }} autoFocus placeholder="câu của bạn…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      </>
    );
  }
  // recall
  return (
    <>
      <div className="fc-hint">chạm hoặc Space để lật</div>
      <div className="fc-verb">{card.v}</div>
    </>
  );
}
