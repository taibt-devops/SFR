// Nút hỏi đáp nổi + trạng thái của tấm trượt (spec Phần 11).
// Tách khỏi AskSheet để AskSheet thuần vẽ: file này giữ mọi thứ "bẩn" — mạng, localStorage, lỗi.
import { useCallback, useState } from "react";
import AskSheet from "./AskSheet.jsx";
import { askEnglish } from "../ai/ask.js";
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

  const submit = useCallback(() => {
    const vi = q.trim();
    if (!vi) return;
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
  }, [q]);

  // Mở lại câu cũ: câu trả lời đã nằm sẵn trong kho nên KHÔNG gọi mạng.
  const pick = useCallback((r) => {
    setQ(r.vi); setAnswer(r.a); setAskedVi(r.vi); setErr(""); setSaved(false);
  }, []);

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
      onAttempt={onAttempt}
      onClose={() => { setOpen(false); reset(); }}
    />
  );
}
