// Client gọi proxy /ask → Việt sang Anh (spec Phần 11). Không token ở client (C7).
// Trả JSON THÔ; làm sạch bằng srs/ask.js:sanitizeAnswer ở nơi gọi.
import { authHeaders } from "./auth.js";

const URL = import.meta.env.VITE_PROXY_URL;
// 20s. Whisper hồi trước KHÔNG có timeout nên khi máy chủ nghẹn, người dùng ngồi nhìn
// "Đang nghe bạn nói…" vĩnh viễn mà không biết chuyện gì. Đừng lặp lại.
const TIMEOUT_MS = 20_000;

export async function askEnglish(vi) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(URL.replace(/\/$/, "") + "/ask", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ vi }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error("proxy lỗi " + r.status);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
