// Nút hỏi đáp nổi + trạng thái của tấm trượt (spec Phần 11).
// Tách khỏi AskSheet để AskSheet thuần vẽ: file này giữ mọi thứ "bẩn" — mạng, localStorage, lỗi.
import { useCallback, useState } from "react";
import AskSheet from "./AskSheet.jsx";
import { askEnglish } from "../ai/ask.js";
import { useRecorder } from "../hooks/useRecorder.js";
import { isAsrJunk } from "../utils/viAsr.js";
import { addAsk, loadAsk, recentAsks, sanitizeAnswer, saveAsk } from "../srs/ask.js";

// Người học không cần biết "proxy lỗi 500" nghĩa là gì — họ cần biết NÊN LÀM GÌ tiếp.
// Chuỗi kỹ thuật chỉ còn nằm ở cuối, trong ngoặc, cho lúc cần báo lỗi.
function loiTiengViet(e) {
  const raw = String(e?.message || e);
  if (e?.name === "AbortError") return "Máy chủ không trả lời (quá 20 giây). Thử lại nhé.";
  if (/\b401\b|\b403\b/.test(raw)) return "Mật khẩu không còn hiệu lực — đăng nhập lại giúp tôi.";
  if (/\b5\d\d\b/.test(raw)) return "Máy chủ đang trục trặc. Đợi một chút rồi thử lại.";
  if (/failed to fetch|networkerror|load failed/i.test(raw)) return "Không kết nối được máy chủ. Kiểm tra mạng nhé.";
  return "Chưa hỏi được, thử lại nhé. (" + raw + ")";
}

// Câu mồi cho bộ giải mã Whisper. Nó KHÔNG phải lệnh — model chỉ coi đây là "đoạn văn ngay trước
// đoạn sắp nghe", nên nó bắt chước kiểu chữ trong này: tiếng Việt, có dấu đầy đủ, câu hỏi đời
// thường. Không có mồi, model hay trả chữ không dấu hoặc lẫn sang chính tả tiếng Anh.
// CỐ Ý không đặt vào đây mấy câu gợi ý mồi của tấm trượt: đo được là khi câu nói TRÙNG với câu
// trong mồi thì model chép lại nguyên văn — nhìn như nhận dạng hoàn hảo trong khi nó chỉ đang
// nhại. Mồi chỉ nên định KIỂU CHỮ (tiếng Việt có dấu, câu hỏi đời thường), không mớm nội dung.
const MOI_VI =
  "Sau đây là một câu hỏi ngắn bằng tiếng Việt thường ngày, viết có dấu đầy đủ và đúng chính tả.";

// Ghi dưới 1 giây gần như chắc chắn là bấm nhầm hoặc chưa kịp nói. Whisper không im lặng khi
// không nghe ra gì — nó bịa (xem utils/viAsr.js), nên chặn từ đây rẻ hơn là đi lọc kết quả.
const TOI_THIEU_GIAY = 1;

export default function AskFab({ onAddWord, onAttempt }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [answer, setAnswer] = useState(null);
  // Câu tiếng Việt ĐÃ SINH RA `answer`, không phải câu đang gõ trong ô. Hai thứ này lệch nhau khi
  // người học gõ câu mới rồi bấm ⭐ mà chưa gửi — lấy `q` lúc đó sẽ lưu sai nghĩa cho câu cũ.
  const [askedVi, setAskedVi] = useState("");
  const [saved, setSaved] = useState(false);
  const [store, setStore] = useState(loadAsk);

  const reset = () => {
    setQ(""); setAnswer(null); setAskedVi(""); setErr(""); setSaved(false); setBusy(false);
  };

  const run = useCallback((vi) => {
    if (!vi) return;
    setQ(vi);
    setBusy(true); setErr(""); setAnswer(null); setSaved(false);
    askEnglish(vi)
      .then((raw) => {
        const a = sanitizeAnswer(raw);
        if (!a) throw new Error("Không đọc được câu trả lời. Thử lại nhé.");
        setAnswer(a);
        setAskedVi(vi);
        setStore((prev) => { const next = addAsk(prev, vi, a, Date.now()); saveAsk(next); return next; });
      })
      .catch((e) => setErr(loiTiengViet(e)))
      .finally(() => setBusy(false));
  }, []);

  const submit = useCallback(() => run(q.trim()), [run, q]);

  // Mic: đọc câu hỏi bằng TIẾNG VIỆT thay vì gõ. Whisper large-v3 đa ngữ nên chỉ cần đổi `lang`.
  //
  // CHỈ điền vào ô, KHÔNG tự gửi luôn. Whisper nghe tiếng Việt chưa chắc chuẩn; tự gửi một câu
  // nghe nhầm là vừa tốn một lượt gọi Claude vừa trả lời sai câu người ta không hỏi. Điền ra để
  // mắt soát trước, mũi tên sáng lên ngay cạnh — sửa rồi bấm là xong.
  //
  // countSpeak: false — nói tiếng Việt để tra KHÔNG phải luyện nói tiếng Anh (xem useRecorder).
  //
  // Và chỉ điền khi kết quả CÓ THỂ TIN. Dán một câu bịa vào ô còn tệ hơn báo không nghe được:
  // người dùng tưởng máy nghe ra thật rồi đi hỏi một câu mình chưa từng nói.
  const [micErr, setMicErr] = useState("");
  const ngheXong = useCallback((text, seconds) => {
    if (seconds < TOI_THIEU_GIAY) {
      setMicErr("Đoạn ghi quá ngắn. Bấm mic, nói cả câu, rồi bấm dừng.");
      return;
    }
    if (isAsrJunk(text)) {
      setMicErr("Chưa nghe rõ. Nói chậm và gần mic hơn một chút, hoặc gõ tay cũng được.");
      return;
    }
    setMicErr("");
    setQ(text);
  }, []);

  const micGoc = useRecorder(ngheXong, { lang: "vi", prompt: MOI_VI, countSpeak: false });
  const mic = {
    ...micGoc,
    start: () => { setMicErr(""); return micGoc.start(); },
  };

  // Bấm một ô gợi ý. Có sẵn câu trả lời trong kho (lịch sử) → hiện luôn, KHÔNG gọi mạng.
  // Không có (gợi ý mồi lúc chưa hỏi gì) → hỏi luôn, đỡ bắt người ta bấm thêm một nhát nữa.
  const pick = useCallback((r) => {
    if (!r?.a) return run(r?.vi || "");
    setQ(r.vi); setAnswer(r.a); setAskedVi(r.vi); setErr(""); setSaved(false);
  }, [run]);

  // Lưu vào từ vựng của NGÀY đang học: câu tiếng Anh làm "từ", câu tiếng Việt làm nghĩa.
  // myWordItems dựng variants [{ vi, en }] nên lúc ôn sẽ hỏi ĐÚNG CHIỀU Việt→Anh.
  const save = useCallback(() => {
    if (!answer) return;
    onAddWord?.({ w: answer.en, m: askedVi, en: answer.en });
    setSaved(true);
  }, [answer, askedVi, onAddWord]);

  if (!open) {
    return (
      <button className="fab" aria-label="Hỏi câu này tiếng Anh nói sao" onClick={() => setOpen(true)}>💬</button>
    );
  }

  return (
    <AskSheet
      q={q}
      onQ={setQ}
      onSubmit={submit}
      busy={busy}
      err={err}
      answer={answer}
      recents={recentAsks(store, 8)}
      onPick={pick}
      onSave={save}
      saved={saved}
      mic={micErr ? { ...mic, phase: "error", error: micErr, reset: () => setMicErr("") } : mic}
      onAttempt={onAttempt}
      onClose={() => { setOpen(false); mic.stop(); reset(); }}
    />
  );
}
