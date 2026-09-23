// Client STT — gửi audio tới whisper service (openai-whisper-asr-webservice).
// Service này có ffmpeg → nhận thẳng webm/opus từ MediaRecorder (encode=true), khỏi convert wav.
// Cùng origin: VITE_WHISPER_URL=/whisper/asr → nginx route tới container whisper. KHÔNG ra internet.
import { authHeaders } from "./auth.js";

const WURL = import.meta.env.VITE_WHISPER_URL || "/whisper/asr";

// Trên GPU một câu mất ~0.35s. Khi container Whisper mất quyền truy cập GPU (xem Known Issues
// trong CLAUDE.md) nó rơi về CPU và mất ~4s, có lúc lâu hơn nhiều. KHÔNG có giới hạn thời gian thì
// màn hình đứng ở "Đang nghe bạn nói…" vĩnh viễn — người học không có đường nào thoát.
const TIMEOUT_MS = 25_000;

// `lang` mặc định "en" — mọi nhịp luyện nói giữ nguyên hành vi cũ. Ô hỏi đáp (Phần 11) truyền "vi"
// để đọc câu hỏi tiếng Việt. Model large-v3 là đa ngữ nên chỉ cần đổi tham số, không đổi container.
// Đã đo trên cùng một audio: language=en trả "Cho Toi Zin Ho Don", language=vi trả "Cho tôi dân hồ
// đoàn." — tham số có tác dụng thật, độ trễ không đổi (~375ms).
export async function transcribe(blob, { lang = "en" } = {}) {
  const fd = new FormData();
  fd.append("audio_file", blob, "speech.webm");
  const url = WURL + (WURL.includes("?") ? "&" : "?") +
    "encode=true&task=transcribe&language=" + encodeURIComponent(lang) + "&output=txt";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let r;
  try {
    r = await fetch(url, { method: "POST", headers: authHeaders(false), body: fd, signal: ctrl.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(`Nghe quá ${TIMEOUT_MS / 1000}s chưa xong — máy chủ đang chậm. Thử nói lại.`);
    }
    throw new Error("Không gọi được dịch vụ nghe: " + String(e.message || e));
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) throw new Error("whisper lỗi " + r.status);
  return (await r.text()).trim();
}
