// Tấm trượt hỏi đáp Việt→Anh (spec Phần 11). CHỈ VẼ — không mạng, không localStorage.
//
// C10 (nói là bắt buộc): ô nhập ở đây gõ TIẾNG VIỆT để đặt câu hỏi, không phải gõ tiếng Anh để né
// mở miệng — cùng lý do AddWordModal được phép có ô chữ. Ranh giới này mỏng nên được giữ bằng CẤU
// TRÚC, không bằng lời khuyên: KHÔNG có đường nào từ ô nhập ghi ra một attempt. Attempt chỉ sinh
// từ SpeakCheck bên dưới. Đừng thêm đường tắt nào.
import { useState } from "react";
import SpeakCheck from "./SpeakCheck.jsx";
import { speak } from "../utils/tts.js";

// Mồi cho lần đầu mở, khi chưa có lịch sử. Không có nó thì tấm trượt chỉ là một ô trống lửng lơ —
// người mới không biết nên gõ ở "tầm" nào (một từ? cả đoạn?). Ba câu này trả lời điều đó mà không
// cần một dòng hướng dẫn nào.
const MOI = ["cho tôi xin hoá đơn", "cái này bao nhiêu tiền", "tôi đi lối nào ạ"];

// Mũi tên và dấu ✕ vẽ bằng SVG chứ không dùng ký tự "→" / "✕": ký tự phụ thuộc vào font, nét
// mảnh teo và lệch tâm trong nút 46px. SVG cho nét dày đều và canh giữa chuẩn ở mọi máy.
// Các biểu tượng NỘI DUNG (🔊 🎙️ ⭐) vẫn để emoji cho đồng bộ với phần còn lại của app.
const IcoSend = () => (
  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h14M12 5l7 7-7 7" />
  </svg>
);
const IcoClose = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

function Cau({ en, ipa, nho }) {
  return (
    <div className="ask-row">
      <div>
        <p className={nho ? "ask-en-sm" : "ask-en"}>{en}</p>
        {ipa && <p className="ask-ipa">{ipa}</p>}
      </div>
      <button className="icon-btn" onClick={() => speak(en)} aria-label={"Nghe: " + en}>🔊</button>
    </div>
  );
}

export default function AskSheet({
  q, onQ, onSubmit, busy, err, answer, recents, onPick, onSave, saved, onAttempt, onClose,
}) {
  const [speaking, setSpeaking] = useState(false);
  const ok = !!q.trim();
  // Chỉ mời gợi ý khi thật sự chưa có gì để hiện — đã có lịch sử thì lịch sử hữu ích hơn.
  const goiY = !busy && !err && !answer && recents.length === 0;

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />

        <div className="sheet-head">
          <p className="sheet-title">Câu này tiếng Anh nói sao?</p>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng"><IcoClose /></button>
        </div>

        <div className="ask-field">
          <input
            autoFocus
            placeholder="gõ câu tiếng Việt…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ok && !busy && onSubmit()}
          />
          <button
            className={busy ? "ask-send is-busy" : "ask-send"}
            disabled={!ok || busy}
            onClick={onSubmit}
            aria-label="Hỏi"
          >
            {busy ? <span className="spin" /> : <IcoSend />}
          </button>
        </div>

        {busy && (
          <div className="ask-skel" aria-label="Đang tìm cách nói tự nhiên nhất">
            <i /><i /><i />
          </div>
        )}

        {err && (
          <div className="err">
            {err}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-sm" onClick={onSubmit}>Thử lại</button>
            </div>
          </div>
        )}

        {goiY && (
          <>
            <p className="ask-label">Thử hỏi</p>
            <div className="chips">
              {MOI.map((m) => (
                <button key={m} className="chip chip-seed" onClick={() => onPick({ vi: m, a: null })}>{m}</button>
              ))}
            </div>
          </>
        )}

        {!busy && !err && !answer && recents.length > 0 && (
          <>
            <p className="ask-label">Đã hỏi gần đây</p>
            <div className="chips">
              {recents.map((r) => (
                <button key={r.at} className="chip" onClick={() => onPick(r)} title={r.vi}>{r.vi}</button>
              ))}
            </div>
          </>
        )}

        {answer && !busy && (
          <>
            <div className="ask-card">
              <Cau en={answer.en} ipa={answer.ipa} />
              {answer.use && <p className="ask-use">{answer.use}</p>}
              {answer.say && <p className="ask-say">{answer.say}</p>}
              {answer.alt && (
                <div className="ask-alt">
                  <span className="ask-alt-tag">
                    Nói khác{answer.alt.note ? ` · ${answer.alt.note}` : ""}
                  </span>
                  <Cau en={answer.alt.en} ipa={answer.alt.ipa} nho />
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
              <div className="ask-acts">
                <button className="ask-act ask-act-go" onClick={() => setSpeaking(true)}>🎙️ Nói thử</button>
                <button className="ask-act ask-act-save" disabled={saved} onClick={onSave}>
                  {saved ? "✓ Đã lưu" : "⭐ Lưu vào ôn"}
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
      </div>
    </div>
  );
}
