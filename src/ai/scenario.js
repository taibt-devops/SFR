// Client gọi proxy /scenario → tình huống đóng vai theo CHỦ ĐỀ từ vựng. Token KHÔNG ở client (C7).
import { authHeaders } from "./auth.js";
const URL = import.meta.env.VITE_PROXY_URL;

// Dựng tình huống mất ~6-7s (Claude phải nghĩ ra cả vai, nhiệm vụ). KHÔNG có giới hạn thời gian
// thì một lần nghẽn mạng là màn brief treo vĩnh viễn — đúng lỗi đã gặp thật.
const TIMEOUT_MS = 25_000;

export async function genScenario(topic, level = "A2") {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let r;
  try {
    r = await fetch(URL.replace(/\/$/, "") + "/scenario", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ topic, level }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new Error(e?.name === "AbortError" ? "quá 25 giây" : String(e?.message || e));
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  if (!data.scenario) throw new Error("Không tạo được tình huống — thử lại.");
  return data.scenario; // {id:"gen", title, aiRole, userRole, goal}
}
