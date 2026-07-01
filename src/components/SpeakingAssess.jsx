// Đánh giá NÓI theo CEFR (GĐ1): đề → ghi âm → Whisper → Claude chấm 4 trục → thẻ kết quả + lưu lịch sử.
// Mic kích hoạt trong cú chạm (iOS). Phát âm: ước lượng (xem proxy /assess).
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribe } from "../ai/whisper.js";
import { assessSpeaking } from "../ai/assess.js";
import { speechStats } from "../utils/fluency.js";
import { loadSpeaking, saveSpeaking, addAssessment, latestLevel } from "../srs/speaking.js";

const TASKS = [
  "Describe your typical morning routine.",
  "Talk about a place you'd like to visit and why.",
  "Describe a person who has influenced you.",
  "What do you do to relax, and why?",
  "Talk about a skill you want to learn this year.",
  "Describe your hometown and what you like about it.",
  "Pros and cons of working from home — what's your view?",
  "Talk about a memorable trip or experience.",
];
const pickTask = () => TASKS[Math.floor(Math.random() * TASKS.length)];

const DIM_LABEL = { fluency: "Trôi chảy", lexical: "Vốn từ", grammar: "Ngữ pháp", pronunciation: "Phát âm" };

export default function SpeakingAssess({ dueWords, topic, onBack }) {
  const [task, setTask] = useState(() => (topic ? "Talk about: " + topic : pickTask()));
  const [phase, setPhase] = useState("ready"); // ready | recording | working | result | error
  const [working, setWorking] = useState(""); // nhãn bước đang chạy
  const [result, setResult] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [last, setLast] = useState(() => latestLevel(loadSpeaking()));

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const startedAt = useRef(0);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stopTracks(), [stopTracks]);

  async function process(blob, seconds) {
    try {
      setPhase("working");
      setWorking("Đang nghe (Whisper)…");
      const said = await transcribe(blob);
      if (!said) { setError("Không nghe rõ — thử nói to & rõ hơn."); setPhase("error"); return; }
      setTranscript(said);
      const stats = speechStats(said, seconds);
      setWorking("Gia sư đang chấm…");
      const r = await assessSpeaking({ ...stats, transcript: said, task });
      setResult(r);
      setPhase("result");
      const entry = { at: Date.now(), task, stats, ...r };
      const list = addAssessment(loadSpeaking(), entry);
      saveSpeaking(list);
      setLast(latestLevel(list));
    } catch (e) {
      setError(String(e.message || e));
      setPhase("error");
    }
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stopTracks();
        const seconds = (Date.now() - startedAt.current) / 1000;
        process(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }), seconds);
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Không mở được mic: " + String(e.message || e));
      setPhase("error");
    }
  }
  const stopRecording = () => recRef.current?.state === "recording" && recRef.current.stop();

  function newTask() {
    setTask(pickTask());
    setResult(null);
    setTranscript("");
    setError("");
    setPhase("ready");
  }

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Đánh giá nói (CEFR)</span>
        <button className="link-exit" onClick={onBack}>← Về</button>
      </div>
      {last && <p className="app-sub" style={{ marginTop: 6 }}>Trình độ gần nhất: <b style={{ color: "var(--teal)" }}>{last}</b></p>}

      {phase !== "result" && (
        <>
          <div className="sec-lab">Đề bài — nói tự nhiên 30–60 giây</div>
          <div className="story-text">{task}</div>
          {dueWords.length > 0 && (
            <p className="app-sub" style={{ marginTop: 8 }}>Cố dùng vài từ đang ôn: {dueWords.slice(0, 6).join(", ")}</p>
          )}
        </>
      )}

      {phase === "working" && <p className="empty-msg">{working}</p>}
      {phase === "error" && (
        <p className="empty-msg" style={{ color: "var(--red)" }}>
          {error}<br /><button className="link-exit" onClick={newTask}>Thử lại</button>
        </p>
      )}

      {phase === "result" && result && <Result result={result} transcript={transcript} />}

      <div className="spacer" />

      {phase === "ready" && (
        <button className="cta" onClick={startRecording}><span className="cta-main">🎤 Ghi câu trả lời</span></button>
      )}
      {phase === "recording" && (
        <button className="cta" style={{ background: "var(--red)" }} onClick={stopRecording}>
          <span className="cta-main">■ Dừng & chấm</span>
        </button>
      )}
      {phase === "result" && (
        <button className="cta" onClick={newTask}><span className="cta-main">Bài mới</span></button>
      )}
    </div>
  );
}

function Result({ result, transcript }) {
  const dims = result.dims || {};
  return (
    <div style={{ marginTop: 14 }}>
      <div className="assess-level">
        <div className="assess-cefr">{result.cefr || "?"}</div>
        <div className="assess-sum">{result.summary}</div>
      </div>

      <div className="sec-lab">4 trục</div>
      {["fluency", "lexical", "grammar", "pronunciation"].map((k) => (
        dims[k] && (
          <div key={k} className="next-due" style={{ marginTop: 6 }}>
            <span className="nd-lab"><b style={{ color: "var(--text)" }}>{DIM_LABEL[k]}</b> · {dims[k].note}</span>
            <span className="nd-val">{dims[k].level}</span>
          </div>
        )
      ))}

      <Section title="✅ Điểm mạnh" items={result.strengths} color="var(--green)" />
      <Section title="⚠️ Điểm yếu" items={result.weaknesses} color="var(--amber)" />
      <Section title="🔧 Cần sửa" items={result.fixes} color="var(--blue)" />

      {transcript && (
        <details style={{ marginTop: 14 }}>
          <summary className="app-sub" style={{ cursor: "pointer" }}>Xem lại lời bạn nói (Whisper)</summary>
          <p className="app-sub" style={{ marginTop: 6, fontStyle: "italic" }}>{transcript}</p>
        </details>
      )}
    </div>
  );
}

function Section({ title, items, color }) {
  if (!items || !items.length) return null;
  return (
    <>
      <div className="sec-lab" style={{ color }}>{title}</div>
      <ul className="assess-list">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </>
  );
}
