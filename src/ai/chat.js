// Client gọi proxy `/` (chat) → câu trả lời Claude cho luyện nói. Token KHÔNG ở client (C7).
// API stateless → gửi lại TOÀN BỘ history mỗi lượt (spec §3.2).
import { authHeaders } from "./auth.js";
const URL = import.meta.env.VITE_PROXY_URL;

export async function reply(history, dueWords = [], opts = {}) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const { level = "A2", focus = "", topic = "", opener = false, recall = "" } = opts;
  const r = await fetch(URL.replace(/\/$/, ""), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ history, dueWords, level, focus, topic, opener, recall }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.text || "";
}
