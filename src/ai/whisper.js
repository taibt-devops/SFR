// Client STT — gửi audio tới whisper service (openai-whisper-asr-webservice).
// Service này có ffmpeg → nhận thẳng webm/opus từ MediaRecorder (encode=true), khỏi convert wav.
// Cùng origin: VITE_WHISPER_URL=/whisper/asr → nginx route tới container whisper. KHÔNG ra internet.
const WURL = import.meta.env.VITE_WHISPER_URL || "/whisper/asr";

export async function transcribe(blob) {
  const fd = new FormData();
  fd.append("audio_file", blob, "speech.webm");
  const url = WURL + (WURL.includes("?") ? "&" : "?") + "encode=true&task=transcribe&language=en&output=txt";
  const r = await fetch(url, { method: "POST", body: fd });
  if (!r.ok) throw new Error("whisper lỗi " + r.status);
  return (await r.text()).trim();
}
