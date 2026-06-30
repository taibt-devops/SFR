// Client gọi proxy /mine → trả mảng thẻ thô {c,v,m,e,d,col}.
// Token KHÔNG ở frontend (C7) — chỉ gửi x-proxy-secret. Cấu hình qua VITE_PROXY_URL / VITE_PROXY_SECRET.
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;

export async function mineVocab(text, level = "intermediate") {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/mine", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ text, level }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return Array.isArray(data.cards) ? data.cards : [];
}
