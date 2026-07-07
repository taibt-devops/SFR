// Client gọi proxy /scenario → tình huống đóng vai theo CHỦ ĐỀ từ vựng. Token KHÔNG ở client (C7).
import { authHeaders } from "./auth.js";
const URL = import.meta.env.VITE_PROXY_URL;

export async function genScenario(topic, level = "A2") {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/scenario", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ topic, level }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  if (!data.scenario) throw new Error("Không tạo được tình huống — thử lại.");
  return data.scenario; // {id:"gen", title, aiRole, userRole, goal}
}
