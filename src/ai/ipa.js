// Client gọi proxy /ipa → phiên âm IPA của từ. Cache localStorage (mỗi từ chỉ gọi 1 lần).
import { authHeaders } from "./auth.js";
const URL = import.meta.env.VITE_PROXY_URL;
const CACHE_KEY = "phrasal-ipa-v1";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

export function cachedIpa(word) {
  return loadCache()[word] || null;
}

export async function getIpa(word) {
  const c = cachedIpa(word);
  if (c) return c;
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL.");
  const r = await fetch(URL.replace(/\/$/, "") + "/ipa", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ word }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  const ipa = (data.ipa || "").trim();
  try {
    const m = loadCache();
    m[word] = ipa;
    localStorage.setItem(CACHE_KEY, JSON.stringify(m));
  } catch {
    /* cache đầy — bỏ qua */
  }
  return ipa;
}
