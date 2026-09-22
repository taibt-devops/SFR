// Một lượt trong cuộc gọi. Công cụ (nghe / dịch / đọc theo / thêm từ) ẨN cho tới khi chạm vào
// bong bóng — trước đây 4 nút này bày ra dưới MỌI bong bóng, mười lượt là bốn mươi nút trên màn.
//
// Chạm vào một TỪ vẫn tra nghĩa được ngay, không cần mở công cụ (giữ nguyên hành vi cũ).
import { useState } from "react";
import { speak } from "../utils/tts.js";

// Mỗi từ là một vùng chạm để tra nghĩa.
// stopPropagation là BẮT BUỘC: không có nó, click nổi bọt lên .turn-body và bật luôn hàng 4 nút
// công cụ — đúng lúc người học chỉ muốn đọc nghĩa thì màn lại nhảy thêm một hàng nút.
function Clickable({ text, onWord }) {
  return text.split(/(\s+)/).map((tok, i) =>
    /[A-Za-z]/.test(tok) ? (
      <span
        key={i}
        className="lookup-word"
        onClick={(e) => { e.stopPropagation(); onWord(tok); }}
      >{tok}</span>
    ) : (
      <span key={i}>{tok}</span>
    )
  );
}

export default function CallBubble({ role, text, onWord, onShadow, onAddWord }) {
  const [open, setOpen] = useState(false);
  const mine = role === "user";

  return (
    <div className={`turn ${mine ? "turn-me" : "turn-ai"}`}>
      <div className="turn-who">{mine ? "Bạn" : "Gia sư"}</div>
      <div className="turn-body" onClick={() => !mine && setOpen((v) => !v)}>
        <Clickable text={text} onWord={(w) => onWord(w, text)} />
      </div>

      {!mine && open && (
        <div className="turn-tools">
          <button className="btn btn-sm" onClick={() => speak(text)}>🔊 Nghe</button>
          <button className="btn btn-sm" onClick={() => onWord(text, text)}>🌐 Dịch</button>
          <button className="btn btn-sm" onClick={() => onShadow(text)}>🎯 Đọc theo</button>
          <button className="btn btn-sm" onClick={() => onAddWord({ en: text })}>＋ Từ</button>
        </div>
      )}
    </div>
  );
}
