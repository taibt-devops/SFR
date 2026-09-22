// Client gọi proxy /tutor → phân tích cuối buổi. Không token ở client (C7).
// Trả { errors[], strengths[], focus, drills[], hints[] } — CHƯA lọc; lọc ở srs/tutor.js.
import { authHeaders } from "./auth.js";

const URL = import.meta.env.VITE_PROXY_URL;
const TIMEOUT_MS = 30_000;

export async function analyzeSession({ level = "A2", pattern = "", attempts = [], recentErrors = [] }) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(URL.replace(/\/$/, "") + "/tutor", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ level, pattern, attempts, recentErrors }),
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
