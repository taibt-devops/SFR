// Popup đăng nhập khi mở app. Mật khẩu = x-proxy-secret của proxy (kiểm tra qua /ping).
// Nhập đúng → lưu vào localStorage, mọi call Claude/whisper kèm theo header này.
import { useState } from "react";
import { verify, setSecret } from "../ai/auth.js";

export default function Login({ onSuccess }) {
  const [pw, setPw] = useState("");
  const [state, setState] = useState("idle"); // idle | checking | error
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!pw.trim() || state === "checking") return;
    setState("checking");
    setErr("");
    try {
      const ok = await verify(pw.trim());
      if (ok) {
        setSecret(pw.trim());
        onSuccess();
      } else {
        setState("error");
        setErr("Mật khẩu không đúng.");
      }
    } catch (e2) {
      setState("error");
      setErr(e2.message || "Không kết nối được máy chủ.");
    }
  }

  return (
    <div className="app">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "22vh" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🗣️</div>
        <div className="app-title" style={{ fontSize: 22 }}>Luyện nói tiếng Anh</div>
        <p className="app-sub" style={{ marginTop: 6, marginBottom: 24 }}>Nhập mật khẩu để bắt đầu</p>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 320 }}>
          <input
            type="password"
            value={pw}
            autoFocus
            placeholder="Mật khẩu"
            onChange={(e) => { setPw(e.target.value); if (state === "error") setState("idle"); }}
            style={{
              width: "100%", boxSizing: "border-box", padding: "14px 16px", fontSize: 16,
              borderRadius: 12, border: "1px solid var(--border, #d0d5dd)", outline: "none",
            }}
          />
          {err && <div style={{ color: "var(--red, #d92d20)", fontSize: 14, marginTop: 10 }}>{err}</div>}
          <button className="cta" type="submit" disabled={state === "checking" || !pw.trim()} style={{ marginTop: 16, width: "100%" }}>
            <span className="cta-main">{state === "checking" ? "Đang kiểm tra…" : "Đăng nhập"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
