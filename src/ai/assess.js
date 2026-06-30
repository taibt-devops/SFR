// Client gọi proxy /assess → chấm bài nói theo CEFR. Không token ở client (C7).
// Trả { cefr, summary, dims:{fluency,lexical,grammar,pronunciation:{level,note}}, strengths[], weaknesses[], fixes[] }.
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;

export async function assessSpeaking({ transcript, seconds, words, wpm, fillers, task }) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/assess", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ transcript, seconds, words, wpm, fillers, task }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data;
}
