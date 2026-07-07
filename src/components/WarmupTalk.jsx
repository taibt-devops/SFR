// Khởi động nói 1 phút (#5): nói tự do theo gợi ý → Whisper → đo nhịp nói (speechStats) — KHÔNG gọi Claude.
// Mic mở trong cú chạm người dùng (iOS); tự dừng sau 60s. Lưu `phrasal-warmup-v1` → trend 7 ngày.
// Chỉ là thước đo trôi chảy, KHÔNG đụng SM-2.
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribe } from "../ai/whisper.js";
import { speechStats } from "../utils/fluency.js";
import { loadWarmup, saveWarmup, addWarmup, warmupTrend } from "../srs/warmup.js";

const PROMPTS = [
  "Kể về ngày hôm nay của bạn — bạn đã làm gì?",
  "Hôm qua có gì đáng nhớ? Kể lại nhé.",
  "Kế hoạch của bạn cho ngày mai là gì?",
  "Điều gì làm bạn vui (hoặc bực mình) gần đây?",
];
const LIMIT = 60; // giây

export default function WarmupTalk({ onBack }) {
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | done | error
  const [left, setLeft] = useState(LIMIT);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // {stats, transcript, prevWpm}
  const [list, setList] = useState(loadWarmup);

  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef(null);

  const cleanup = useCallback(() => {
    clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  async function start() {
    setError("");
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        cleanup();
        const seconds = Math.min(LIMIT, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setPhase("thinking");
        try {
          const transcript = await transcribe(blob);
          const stats = speechStats(transcript, seconds);
          const prevWpm = list.length ? list[0].wpm : null; // lần gần nhất trước đó
          const next = addWarmup(list, { at: Date.now(), ...stats });
          saveWarmup(next);
          setList(next);
          setResult({ stats, transcript, prevWpm });
          setPhase("done");
        } catch (e) {
          setError(String(e.message || e));
          setPhase("error");
        }
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      setLeft(LIMIT);
      // đếm ngược + tự dừng khi hết 60s
      tickRef.current = setInterval(() => {
        const remain = LIMIT - Math.round((Date.now() - startedAtRef.current) / 1000);
        setLeft(Math.max(0, remain));
        if (remain <= 0) stop();
      }, 500);
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Không mở được mic: " + String(e.message || e));
      setPhase("error");
    }
  }

  const trend = warmupTrend(list, 7);
  const maxWpm = Math.max(1, ...trend.map((t) => t.wpm));
  const diff = result?.prevWpm != null ? result.stats.wpm - result.prevWpm : null;

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">🎤 Khởi động 1 phút</span>
        <button className="btn-back" onClick={onBack}>← Về</button>
      </div>
      <p className="app-sub" style={{ marginTop: 6 }}>Nói tiếng Anh tự do, không cần hoàn hảo — chỉ đo tốc độ & độ mượt.</p>

      <div className="story-text" style={{ marginTop: 14 }}>
        <div className="app-sub" style={{ marginBottom: 6 }}>Gợi ý hôm nay</div>
        {prompt}
      </div>

      {phase === "recording" && (
        <p style={{ textAlign: "center", fontSize: 40, fontWeight: 800, marginTop: 18, color: left <= 10 ? "var(--amber)" : "var(--teal)" }}>
          {left}s
        </p>
      )}
      {phase === "thinking" && <p className="empty-msg">Đang nghe lại bài nói…</p>}
      {phase === "error" && <p className="empty-msg" style={{ color: "var(--red)" }}>{error}</p>}

      {result && (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="stat stat-due">
              <div className="stat-num">{result.stats.wpm}</div>
              <div className="stat-lab">từ/phút{diff != null && diff !== 0 ? (diff > 0 ? ` · ▲${diff}` : ` · ▼${-diff}`) : ""}</div>
            </div>
            <div className="stat"><div className="stat-num">{result.stats.words}</div><div className="stat-lab">từ đã nói</div></div>
            <div className="stat"><div className="stat-num">{result.stats.fillers}</div><div className="stat-lab">filler (um, uh…)</div></div>
          </div>
          <p className="app-sub" style={{ marginTop: 10 }}>Bạn nói: “{result.transcript}”</p>
        </>
      )}

      {trend.length > 1 && (
        <>
          <div className="sec-lab">Tốc độ nói 7 ngày (từ/phút)</div>
          <div className="trend">
            {trend.map((t) => (
              <div key={t.day} className="trend-bar" style={{ height: `${Math.max(8, (t.wpm / maxWpm) * 100)}%` }}>
                <span>{t.wpm}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="spacer" />
      {phase === "recording" ? (
        <button className="cta" style={{ background: "var(--red)" }} onClick={stop}>
          <span className="cta-main">■ Dừng sớm</span>
        </button>
      ) : (
        <button className="cta" disabled={phase === "thinking"} onClick={start}>
          <span className="cta-main">🎤 {result ? "Nói lại lần nữa" : "Bắt đầu nói (60s)"}</span>
        </button>
      )}
      {result && <button className="cta-ghost" onClick={onBack}>Xong — về trang chủ</button>}
    </div>
  );
}
