// Client gọi proxy /translate → nghĩa tiếng Việt của từ/cụm/câu theo ngữ cảnh. Không token ở client (C7).
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;

export async function translateWord(word, context = "") {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL.");
  const r = await fetch(URL.replace(/\/$/, "") + "/translate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ word, context }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.vi || "";
}
