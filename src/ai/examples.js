// Client gọi proxy /examples → thêm câu ví dụ cho một từ (spec Phần 12). Không token ở client (C7).
// Trả mảng THÔ; làm sạch bằng srs/examples.js:sanitizeEx ở nơi gọi.
import { authHeaders } from "./auth.js";

const URL = import.meta.env.VITE_PROXY_URL;
const TIMEOUT_MS = 20_000;

export async function genExamples({ word, meaning = "", level = "A2", have = [] }) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(URL.replace(/\/$/, "") + "/examples", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ word, meaning, level, have }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error("proxy lỗi " + r.status);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data.items || [];
  } finally {
    clearTimeout(timer);
  }
}
