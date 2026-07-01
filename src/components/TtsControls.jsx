// Chọn giọng đọc + tốc độ (Web Speech API). Lưu localStorage, dùng cho toàn app.
import { useEffect, useState } from "react";
import { englishVoices, getPrefs, setPrefs, speak } from "../utils/tts.js";

const SPEEDS = [
  { v: 0.8, label: "Chậm" },
  { v: 0.92, label: "Vừa" },
  { v: 1, label: "Bình thường" },
  { v: 1.15, label: "Nhanh" },
];

export default function TtsControls() {
  const [voices, setVoices] = useState(englishVoices());
  const [prefs, setLocal] = useState(getPrefs());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // voices nạp bất đồng bộ → cập nhật lại danh sách khi sẵn sàng
    const t = setInterval(() => {
      const evs = englishVoices();
      if (evs.length !== voices.length) setVoices(evs);
    }, 500);
    return () => clearInterval(t);
  }, [voices.length]);

  function update(p) {
    const next = { ...prefs, ...p };
    setLocal(next);
    setPrefs(p);
  }

  if (!open) {
    return (
      <button className="link-exit" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => setOpen(true)}>
        🔊 Giọng đọc
      </button>
    );
  }

  return (
    <div className="tts-box">
      <label className="vs-row">
        <span>Giọng</span>
        <select
          className="field"
          style={{ width: "64%" }}
          value={prefs.voiceURI}
          onChange={(e) => update({ voiceURI: e.target.value })}
        >
          <option value="">Tự động (tốt nhất)</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </label>
      <label className="vs-row" style={{ marginTop: 8 }}>
        <span>Tốc độ</span>
        <select
          className="field"
          style={{ width: "auto" }}
          value={prefs.rate}
          onChange={(e) => update({ rate: Number(e.target.value) })}
        >
          {SPEEDS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="cta-ghost" style={{ marginTop: 0 }} onClick={() => speak("Hello! This is how I sound. Let's practice together.")}>
          ▶ Nghe thử
        </button>
        <button className="cta-ghost" style={{ marginTop: 0 }} onClick={() => setOpen(false)}>Xong</button>
      </div>
      {voices.length === 0 && (
        <p className="app-sub" style={{ marginTop: 8 }}>
          Thiết bị chưa có giọng tiếng Anh nào. Trên máy tính, dùng trình duyệt Edge (giọng Natural) hoặc cài thêm giọng của hệ điều hành.
        </p>
      )}
    </div>
  );
}
