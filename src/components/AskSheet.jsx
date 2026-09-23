// Tấm trượt hỏi đáp Việt→Anh (spec Phần 11). CHỈ VẼ — không mạng, không localStorage.
//
// C10 (nói là bắt buộc): ô nhập ở đây gõ TIẾNG VIỆT để đặt câu hỏi, không phải gõ tiếng Anh để né
// mở miệng — cùng lý do AddWordModal được phép có ô chữ. Ranh giới này mỏng nên được giữ bằng CẤU
// TRÚC, không bằng lời khuyên: KHÔNG có đường nào từ ô nhập ghi ra một attempt. Attempt chỉ sinh
// từ SpeakCheck bên dưới. Đừng thêm đường tắt nào.
import { useState } from "react";
import SpeakCheck from "./SpeakCheck.jsx";
import { speak } from "../utils/tts.js";
import { IcoSend, IcoClose, IcoMic, IcoStop, IcoVolume, IcoStar, IcoCheck } from "./Icon.jsx";

// Mồi cho lần đầu mở, khi chưa có lịch sử. Không có nó thì tấm trượt chỉ là một ô trống lửng lơ —
// người mới không biết nên gõ ở "tầm" nào (một từ? cả đoạn?). Ba câu này trả lời điều đó mà không
// cần một dòng hướng dẫn nào.
const MOI = ["cho tôi xin hoá đơn", "cái này bao nhiêu tiền", "tôi đi lối nào ạ"];

function Cau({ en, ipa, nho }) {
  return (
    <div className="ask-row">
      <div>
        <p className={nho ? "ask-en-sm" : "ask-en"}>{en}</p>
        {ipa && <p className="ask-ipa">{ipa}</p>}
      </div>
      <button className="icon-btn" onClick={() => speak(en)} aria-label={"Nghe: " + en}><IcoVolume size={16} /></button>
    </div>
  );
}

export default function AskSheet({
  q, onQ, onSubmit, busy, err, answer, recents, onPick, onSave, saved, onAttempt, onClose, mic,
}) {
  const [speaking, setSpeaking] = useState(false);
  const ok = !!q.trim();
  const ghiAm = mic?.phase === "recording";
  const dangNghe = mic?.phase === "thinking";
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

        <div className={ghiAm ? "ask-field is-rec" : "ask-field"}>
          <input
            autoFocus
            placeholder={ghiAm ? "đang nghe bạn nói…" : dangNghe ? "đang chuyển thành chữ…" : "gõ hoặc bấm mic…"}
            value={q}
            disabled={ghiAm || dangNghe}
            onChange={(e) => onQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ok && !busy && onSubmit()}
          />
          {mic && (
            <button
              className={ghiAm ? "ask-mic is-rec" : "ask-mic"}
              disabled={busy || dangNghe}
              onClick={ghiAm ? mic.stop : mic.start}
              aria-label={ghiAm ? "Dừng ghi âm" : "Đọc câu hỏi bằng tiếng Việt"}
            >
              {dangNghe ? <span className="spin" /> : ghiAm ? <IcoStop /> : <IcoMic />}
            </button>
          )}
          <button
            className={busy ? "ask-send is-busy" : "ask-send"}
            disabled={!ok || busy || ghiAm || dangNghe}
            onClick={onSubmit}
            aria-label="Hỏi"
          >
            {busy ? <span className="spin" /> : <IcoSend />}
          </button>
        </div>

        {mic?.phase === "error" && (
          <div className="err">
            {mic.error}
            <div style={{ marginTop: 10 }}>
              <button className="btn btn-sm" onClick={mic.reset}>Bỏ qua, tôi gõ</button>
            </div>
          </div>
        )}

        {/* Transcript sai thì phải biết sai ở đâu: mic thu tệ, hay thu tốt mà model nghe nhầm.
            Nghe lại bản ghi là cách duy nhất phân biệt — hai nguyên nhân đó sửa khác hẳn nhau.
            PHẢI hiện cả khi đang báo lỗi: đó chính là lúc cần nó nhất. */}
        {mic?.clip && !ghiAm && !dangNghe && (
          <p className="ask-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn-link" onClick={() => new Audio(mic.clip.url).play()}>
              <IcoVolume size={15} /> Nghe lại bản ghi
            </button>
            <span style={{ textTransform: "none", letterSpacing: 0 }}>
              {mic.clip.seconds}s · {mic.clip.kbps} kbps
            </span>
          </p>
        )}

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
                <button className="ask-act ask-act-go" onClick={() => setSpeaking(true)}><IcoMic size={18} /> Nói thử</button>
                <button className="ask-act ask-act-save" disabled={saved} onClick={onSave}>
                  {saved ? <><IcoCheck size={16} /> Đã lưu</> : <><IcoStar size={16} /> Lưu vào ôn</>}
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
