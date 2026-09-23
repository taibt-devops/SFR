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
// Gọi Whisper, trả CẢ chi tiết: từng từ có mốc thời gian + độ tin cậy của bộ giải mã.
//
// CẢNH BÁO về `p`: đó là độ tin cậy của BỘ GIẢI MÃ, KHÔNG phải điểm phát âm. Whisper đoán từ bằng
// cả âm thanh lẫn ngữ cảnh, nên một từ dễ đoán vẫn được điểm cao dù đọc sai, và một từ hiếm vẫn có
// thể điểm thấp dù đọc chuẩn. Dùng nó như TÍN HIỆU ("chỗ này máy nghe không chắc"), đừng bao giờ
// hiển thị nó như PHÁN QUYẾT ("bạn phát âm sai từ này").
export async function transcribeDetail(blob, { lang = "en", prompt = "" } = {}) {
  const fd = new FormData();
  fd.append("audio_file", blob, "speech.webm");
  // output=json + word_timestamps: cùng một lượt gọi, cùng độ trễ — chỉ là trước đây ta vứt đi.
  const url = WURL + (WURL.includes("?") ? "&" : "?") +
    "encode=true&task=transcribe&vad_filter=true&word_timestamps=true&output=json" +
    "&language=" + encodeURIComponent(lang) +
    (prompt ? "&initial_prompt=" + encodeURIComponent(prompt) : "");

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

  const j = await r.json();
  const segs = Array.isArray(j.segments) ? j.segments : [];
  const words = [];
  for (const sg of segs) {
    for (const w of sg.words || []) {
      const t = String(w.word || "").trim();
      if (t) words.push({ w: t, start: w.start, end: w.end, p: w.probability ?? w.score ?? null });
    }
  }
  // avg_logprob theo TỪNG SEGMENT; lấy trung bình có trọng số theo độ dài để khỏi lệch vì câu ngắn.
  let tong = 0, dai = 0;
  for (const sg of segs) {
    const d = Math.max(0.01, (sg.end || 0) - (sg.start || 0));
    if (typeof sg.avg_logprob === "number") { tong += sg.avg_logprob * d; dai += d; }
  }
  return {
    text: String(j.text || "").trim(),
    words,
    avgLogprob: dai ? tong / dai : null,
  };
}

// Hợp đồng CŨ giữ nguyên — sáu nơi đang gọi chỉ cần chữ, không cần đụng tới.
export async function transcribe(blob, opts) {
  return (await transcribeDetail(blob, opts)).text;
}
