// Hộp "nói rồi chấm" dùng chung cho nhịp 0 (ôn), 4/4b (drill) và 3 (từ mới).
// Vòng đời: bấm mic → ghi âm → Whisper → so từng từ với câu đích → hiện kết quả + nghe mẫu.
//
// KHÔNG có ô gõ chữ (C10). Mic hỏng thì báo lỗi và cho thử lại — không mở đường trốn bằng bàn phím,
// vì gõ chữ đúng là chỗ người học né việc mở miệng.
import { useCallback, useEffect, useState } from "react";
import { useRecorder } from "../hooks/useRecorder.js";
import { diffWords } from "../utils/voiceMatch.js";
import { speak } from "../utils/tts.js";
import { good, miss } from "../utils/sfx.js";
import { doNhipNoi, dauVetAmThanh } from "../utils/speech.js";
import { IcoMic, IcoStop, IcoVolume, IcoRedo, IcoCheck } from "./Icon.jsx";

export const PASS = 0.8; // tỉ lệ từ khớp coi là đạt

// Đếm giây trong lúc chờ Whisper. Bình thường ~0.35s nên không kịp thấy; chỉ khi máy chủ chậm nó
// mới hiện, và lúc đó người học cần biết app còn sống chứ không phải đã chết.
function Waiting() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="muted center pulse">
      Đang nghe bạn nói…{s >= 3 ? ` ${s}s` : ""}
      {s >= 8 && <><br /><span className="small">Máy chủ đang chậm hơn thường lệ.</span></>}
    </p>
  );
}

// Nhịp nói — chỉ hiện khi CÓ chuyện để nói. Câu nào trôi chảy thì không thêm dòng nào cả:
// nhồi số liệu vào mọi lần nói là biến phản hồi thành tiếng ồn.
//
// Câu chữ cố ý nói "máy nghe chưa rõ", KHÔNG nói "bạn phát âm sai". Độ tin cậy của Whisper là độ
// chắc của bộ giải mã, không phải điểm phát âm — từ dễ đoán vẫn điểm cao dù đọc sai. Nói quá lên
// là dạy người học tin vào một con số không đo thứ họ tưởng.
function NhipNoi({ n }) {
  const y = [];
  if (n.yeu) y.push(<span key="y">Máy nghe chưa rõ ở <b>{n.yeu.w}</b> ({n.yeu.p}%)</span>);
  if (n.ngungLau) y.push(<span key="n">Ngập ngừng {n.ngungLau.giay}s trước <b>{n.ngungLau.w}</b></span>);
  if (!y.length) return null;
  return (
    <p className="nhip-noi">
      {y.map((x, i) => <span key={i}>{i > 0 && <i> · </i>}{x}</span>)}
      {n.wpm ? <span className="nhip-wpm"> {n.wpm} từ/phút</span> : null}
    </p>
  );
}

export default function SpeakCheck({ target, prompt, footer, autoHint = false, onAttempt, kind, itemId }) {
  const [result, setResult] = useState(null); // { text, diff, score }

  const onResult = useCallback(
    (text, _giay, chiTiet) => {
      const diff = diffWords(target, text);
      const ok = diff.filter((d) => d.ok).length;
      const score = diff.length ? ok / diff.length : 0;
      setResult({ text, diff, score, nhip: doNhipNoi(chiTiet) });
      // Báo attempt ra ngoài để useLesson gom vào kho gia sư — SpeakCheck là nơi DUY NHẤT
      // chấm câu nói nên báo từ đây là phủ được cả 4 nhịp (0/3/4/4b) (spec §10.3).
      // Kèm dấu vết âm thanh để gia sư cuối ngày có thêm bằng chứng ngoài chữ: từ nào máy nghe
      // chật vật. Chỉ gửi những từ đáng ngờ — gửi cả câu là hàng trăm con số vô nghĩa mỗi buổi.
      onAttempt?.({ kind, itemId, target, heard: text, score, am: dauVetAmThanh(chiTiet) });
      // Phản hồi bằng tai trước khi mắt kịp đọc — biết ngay đạt hay chưa.
      (score >= PASS ? good : miss)();
    },
    [target, onAttempt, kind, itemId]
  );

  const rec = useRecorder(onResult);
  const retry = () => {
    setResult(null);
    rec.reset();
  };

  const passed = result && result.score >= PASS;

  return (
    <>
      {prompt}

      {!result && (
        <>
          {rec.phase === "error" && (
            <div className="err">
              {rec.error}
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-sm" onClick={rec.reset}>Thử lại</button>
              </div>
            </div>
          )}
          {rec.phase === "thinking" && <Waiting />}
          {rec.phase === "recording" ? (
            // Nhịp đập để người học thấy máy ĐANG nghe thật, không phải treo.
            <button className="btn btn-rec rec-live" onClick={rec.stop}><IcoStop size={15} /> Dừng — tôi nói xong rồi</button>
          ) : (
            rec.phase !== "thinking" && (
              <button className="btn btn-primary" onClick={rec.start}><IcoMic size={19} /> Nói câu này</button>
            )
          )}
          {autoHint && (
            <button className="btn-link" onClick={() => speak(target)}>Nghe mẫu trước</button>
          )}
        </>
      )}

      {result && (
        <>
          <div className="card">
            <div className={`verdict ${passed ? "verdict-ok" : "verdict-bad"}`}>
              {passed ? <><IcoCheck size={16} /> Khớp — nói tốt</> : "Gần đúng — xem chỗ lệch"}
            </div>
            <p className="heard" style={{ marginBottom: 6 }}>
              {result.diff.map((d, i) => (
                <span key={i} className={d.ok ? "w-ok" : "w-bad"}>
                  {d.word}{" "}
                </span>
              ))}
            </p>
            <p className="muted small" style={{ margin: 0 }}>Whisper nghe được: “{result.text || "(không rõ)"}”</p>
            {result.nhip && <NhipNoi n={result.nhip} />}
          </div>

          <div className="btn-row">
            <button className="btn" onClick={() => speak(target)}><IcoVolume size={17} /> Nghe mẫu</button>
            <button className="btn" onClick={retry}><IcoRedo size={17} /> Nói lại</button>
          </div>

          {footer?.(result)}
        </>
      )}
    </>
  );
}
