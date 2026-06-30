// Client gọi proxy `/` (chat) → câu trả lời Claude cho luyện nói. Token KHÔNG ở client (C7).
// API stateless → gửi lại TOÀN BỘ history mỗi lượt (spec §3.2).
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;

export async function reply(history, dueWords = []) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, ""), {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ history, dueWords }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.text || "";
}
