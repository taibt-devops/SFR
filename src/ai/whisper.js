// Client STT — gửi audio tới whisper.cpp server local (KHÔNG ra internet; KHÔNG phải Claude).
// Cấu hình VITE_WHISPER_URL (mặc định endpoint /inference của whisper-server, cổng 8080).
//
// LƯU Ý FORMAT: whisper.cpp thường cần WAV 16kHz. MediaRecorder trình duyệt xuất webm/opus →
// whisper-server của bạn cần build có ffmpeg để tự chuyển, HOẶC dùng wrapper chuyển sang wav.
// Nếu transcript rỗng/sai, đây là chỗ kiểm tra đầu tiên.
const WURL = import.meta.env.VITE_WHISPER_URL || "http://localhost:8080/inference";

export async function transcribe(blob) {
  const fd = new FormData();
  fd.append("file", blob, "speech.webm");
  fd.append("response_format", "json");
  fd.append("temperature", "0");
  const r = await fetch(WURL, { method: "POST", body: fd });
  if (!r.ok) throw new Error("whisper lỗi " + r.status);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const d = await r.json();
    return (d.text || "").trim();
  }
  return (await r.text()).trim();
}
