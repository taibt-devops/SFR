// Client gọi proxy /coach → gia sư nhận xét câu người học (produce/reverse). Không token ở client (C7).
// Trả về { verdict: "good"|"ok"|"fix", hint } — gợi ý để TỰ sửa, KHÔNG phải câu đáp án.
const URL = import.meta.env.VITE_PROXY_URL;
const SECRET = import.meta.env.VITE_PROXY_SECRET;

export async function coachSentence({ word, meaning = "", sentence, hintVi = "", col = "" }) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL (xem .env.example) và bật proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/coach", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": SECRET || "" },
    body: JSON.stringify({ word, meaning, sentence, hintVi, col }),
  });
  if (!r.ok) throw new Error("proxy lỗi " + r.status);
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return { verdict: data.verdict || "ok", hint: data.hint || "" };
}
