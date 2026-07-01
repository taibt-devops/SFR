// Client gọi proxy /patterns → mẫu câu cho chủ đề. Có cache localStorage (không gọi lại mỗi lần xem).
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;
const CACHE_KEY = "phrasal-patterns-v1";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

export function cachedPatterns(topic, level) {
  return loadCache()[topic + "|" + level] || null;
}

export async function getPatterns(topic, level = "A2") {
  const cached = cachedPatterns(topic, level);
  if (cached) return cached;
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/patterns", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ topic, level }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  const patterns = Array.isArray(data.patterns) ? data.patterns : [];
  try {
    const c = loadCache();
    c[topic + "|" + level] = patterns;
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* cache đầy — bỏ qua */
  }
  return patterns;
}
