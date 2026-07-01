// Đăng nhập ứng dụng: mật khẩu người dùng = x-proxy-secret gửi lên proxy.
// Nhập đúng mới gọi được Claude/whisper (proxy chặn 401 nếu sai) → bảo vệ thật, không chỉ che UI.
const URL = import.meta.env.VITE_PROXY_URL;
const KEY = "phrasal-auth-v1";

export function getSecret() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}
export function setSecret(s) {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* localStorage không khả dụng */
  }
}
export function clearSecret() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* bỏ qua */
  }
}
export function isAuthed() {
  return !!getSecret();
}

// Header chuẩn cho mọi call proxy (kèm mật khẩu). json=false khi gửi FormData (không set content-type).
export function authHeaders(json = true) {
  const h = { "x-proxy-secret": getSecret() };
  if (json) h["content-type"] = "application/json";
  return h;
}

// Kiểm tra mật khẩu với proxy (/ping). Trả true nếu đúng.
export async function verify(secret) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL — không kết nối được proxy.");
  const r = await fetch(URL.replace(/\/$/, "") + "/ping", {
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": secret },
  });
  return r.ok;
}
