// Client gọi proxy /summary → tổng kết cuối buổi luyện nói. Không token ở client (C7).
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;

export async function summarize({ history, level = "A2", topic = "" }) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/summary", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ history, level, topic }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return { wentWell: data.wentWell || [], toImprove: data.toImprove || [], suggestion: data.suggestion || "" };
}
