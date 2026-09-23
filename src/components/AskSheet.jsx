// Tấm trượt hỏi đáp Việt→Anh (spec Phần 11). CHỈ VẼ — không mạng, không localStorage.
//
// C10 (nói là bắt buộc): ô nhập ở đây gõ TIẾNG VIỆT để đặt câu hỏi, không phải gõ tiếng Anh để né
// mở miệng — cùng lý do AddWordModal được phép có ô chữ. Ranh giới này mỏng nên được giữ bằng CẤU
// TRÚC, không bằng lời khuyên: KHÔNG có đường nào từ ô nhập ghi ra một attempt. Attempt chỉ sinh
// từ SpeakCheck bên dưới. Đừng thêm đường tắt nào.
import { useState } from "react";
import SpeakCheck from "./SpeakCheck.jsx";
import { speak } from "../utils/tts.js";

function Line({ en, ipa, big }) {
  return (
    <div>
      <p className={big ? "ask-en" : ""} style={big ? undefined : { margin: 0, fontSize: 17 }}>
        {en}{" "}
        <button className="btn-link" onClick={() => speak(en)} aria-label={"Nghe: " + en}>🔊</button>
      </p>
      {ipa && <p className="ask-ipa">{ipa}</p>}
    </div>
  );
}

export default function AskSheet({
  q, onQ, onSubmit, busy, err, answer, recents, onPick, onSave, saved, onAttempt, onClose,
}) {
  const [speaking, setSpeaking] = useState(false);
  const ok = !!q.trim();

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Câu này tiếng Anh nói sao?</div>

        <div className="inp-row">
          <input
            className="inp"
            autoFocus
            placeholder="gõ câu tiếng Việt…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ok && !busy && onSubmit()}
          />
          <button className="btn btn-sm" disabled={!ok || busy} onClick={onSubmit}>
            {busy ? "…" : "→"}
          </button>
        </div>

        {busy && <p className="muted center pulse">Đang tìm cách nói tự nhiên nhất…</p>}

        {err && (
          <div className="err">
            {err}
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-sm" onClick={onSubmit}>Thử lại</button>
            </div>
          </div>
        )}

        {!busy && !err && !answer && recents.length > 0 && (
          <>
            <p className="muted small" style={{ margin: "4px 0 0" }}>Đã hỏi gần đây</p>
            <div className="chips">
              {recents.map((r) => (
                <button key={r.at} className="chip" onClick={() => onPick(r)} title={r.vi}>{r.vi}</button>
              ))}
            </div>
          </>
        )}

        {answer && !busy && (
          <>
            <div className="card">
              <Line en={answer.en} ipa={answer.ipa} big />
              {answer.use && <p className="muted small" style={{ marginBottom: 0 }}>{answer.use}</p>}
              {answer.say && <p className="small" style={{ color: "var(--ember)", margin: "6px 0 0" }}>🗣️ {answer.say}</p>}
              {answer.alt && (
                <div className="ask-alt">
                  <p className="muted small" style={{ margin: "0 0 4px" }}>
                    Nói khác{answer.alt.note ? ` · ${answer.alt.note}` : ""}
                  </p>
                  <Line en={answer.alt.en} ipa={answer.alt.ipa} />
                </div>
              )}
            </div>

            {speaking ? (
              <SpeakCheck
                key={answer.en}
                target={answer.en}
                kind="ask"
                onAttempt={onAttempt}
                prompt={<p className="muted small center">Nói lại câu trên.</p>}
              />
            ) : (
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => setSpeaking(true)}>🎙️ Nói thử</button>
                <button className="btn" disabled={saved} onClick={onSave}>
                  {saved ? "✓ Đã lưu" : "⭐ Lưu vào ôn tập"}
                </button>
              </div>
            )}

            {saved && (
              <p className="muted small center" style={{ margin: 0 }}>
                Câu này sẽ quay lại ở <b>ôn nhanh</b> những ngày tới.
              </p>
            )}
          </>
        )}

        <button className="btn" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
