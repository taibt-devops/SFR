// Client gọi proxy /story → đoạn mini-story dùng từ due. Không token ở client (C7).
import { authHeaders } from "./auth.js";
const URL = import.meta.env.VITE_PROXY_URL;

export async function miniStory(dueWords, level = "intermediate") {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/story", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ dueWords, level }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.text || "";
}
