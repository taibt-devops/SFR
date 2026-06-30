// Mining (§5.3): dán văn bản → Claude trích từ → review/tick → merge vào deck (qua importText).
// 3 trạng thái: loading / error (có retry) / success. KHÔNG đụng token (gọi qua proxy).
import { useState } from "react";
import { mineVocab } from "../ai/mine.js";

const LEVELS = ["beginner", "intermediate", "advanced"];

export default function MiningPanel({ importText }) {
  const [text, setText] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [status, setStatus] = useState("idle"); // idle | loading | error | review
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [checked, setChecked] = useState(() => new Set());
  const [msg, setMsg] = useState(null);

  async function run() {
    setStatus("loading");
    setError("");
    setMsg(null);
    try {
      const out = await mineVocab(text, level);
      setCards(out);
      setChecked(new Set(out.map((_, i) => i))); // mặc định chọn hết
      setStatus(out.length ? "review" : "error");
      if (!out.length) setError("Không trích được từ nào — thử đoạn dài/khác hơn.");
    } catch (e) {
      setError(String(e.message || e));
      setStatus("error");
    }
  }

  function toggle(i) {
    setChecked((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  function addSelected() {
    const selected = cards.filter((_, i) => checked.has(i));
    if (!selected.length) return;
    const r = importText(JSON.stringify(selected));
    setMsg(r.ok ? `Đã thêm ${r.added} · trùng/ghi đè ${r.duplicate} · lỗi ${r.invalid}.` : r.error);
    setCards([]);
    setChecked(new Set());
    setText("");
    setStatus("idle");
  }

  return (
    <div>
      <div className="sec-lab">Mining — trích từ văn bản (cần proxy + token)</div>
      {msg && <p className="empty-msg" style={{ marginTop: 0, color: "var(--teal)" }}>{msg}</p>}

      <textarea
        className="field"
        rows={4}
        placeholder="Dán đoạn tiếng Anh (báo, lyrics, phụ đề, chat)…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <select className="field" style={{ width: "auto" }} value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="cta-ghost" style={{ marginTop: 0 }} disabled={!text.trim() || status === "loading"} onClick={run}>
          {status === "loading" ? "Đang trích…" : "Trích từ bằng Claude"}
        </button>
      </div>

      {status === "error" && (
        <p className="empty-msg" style={{ color: "var(--red)" }}>
          {error}
          {text.trim() && <><br /><button className="link-exit" onClick={run}>Thử lại</button></>}
        </p>
      )}

      {status === "review" && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="prog-txt">Chọn từ muốn giữ ({checked.size}/{cards.length})</div>
          {cards.map((c, i) => (
            <label key={i} className="next-due" style={{ marginTop: 0, cursor: "pointer", gap: 10 }}>
              <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} style={{ accentColor: "var(--teal)" }} />
              <span className="nd-lab" style={{ flex: 1 }}>
                <b style={{ color: "var(--text)" }}>{c.v}</b> — {c.m} <span style={{ color: "var(--text3)" }}>· {c.c}</span>
              </span>
            </label>
          ))}
          <button className="cta" style={{ marginTop: 8 }} disabled={!checked.size} onClick={addSelected}>
            <span className="cta-main">Thêm {checked.size} từ đã chọn</span>
          </button>
        </div>
      )}
    </div>
  );
}
