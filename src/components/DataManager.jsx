// Quản lý dữ liệu (spec §Bước 7): thêm/sửa 1 từ, import JSON (dán / file), export, liệt kê & xoá từ user.
// Thuần UI — mọi logic ở useVocab/vocabStore. Thêm từ KHÔNG xoá tiến độ thẻ cũ (state khớp id).
import { useRef, useState } from "react";
import MiningPanel from "./MiningPanel.jsx";

const BLANK = { c: "", v: "", m: "", e: "", d: "", col: "" };
const LABELS = { c: "Chủ đề (c) *", v: "Từ (v) *", m: "Nghĩa (m)", e: "Ví dụ (e)", d: "Dịch (d)", col: "Collocations (col)" };

export default function DataManager({ userWords, addWord, importText, removeWord, exportText, onBack }) {
  const [form, setForm] = useState(BLANK);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null); // { kind:'ok'|'err', text }
  const fileRef = useRef(null);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submitForm(e) {
    e.preventDefault();
    const r = addWord(form);
    if (!r.ok) return setMsg({ kind: "err", text: r.error });
    setForm(BLANK);
    setMsg({ kind: "ok", text: r.duplicate ? "Đã cập nhật từ (trùng id → ghi đè)." : "Đã thêm từ mới." });
  }

  function runImport(text) {
    const r = importText(text);
    if (!r.ok) return setMsg({ kind: "err", text: r.error });
    setMsg({ kind: "ok", text: `Thêm ${r.added} · trùng/ghi đè ${r.duplicate} · lỗi ${r.invalid}.` });
    setPaste("");
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => runImport(String(reader.result || ""));
    reader.readAsText(file);
    e.target.value = ""; // cho phép chọn lại cùng file
  }

  function downloadExport() {
    const blob = new Blob([exportText()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vocab-user.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Quản lý từ vựng</span>
        <button className="link-exit" onClick={onBack}>← Về</button>
      </div>

      {msg && (
        <p className="empty-msg" style={{ marginTop: 14, color: msg.kind === "err" ? "var(--red)" : "var(--teal)" }}>
          {msg.text}
        </p>
      )}

      <div className="sec-lab">Thêm / sửa một từ</div>
      <form onSubmit={submitForm} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.keys(LABELS).map((k) => (
          <input key={k} className="field" placeholder={LABELS[k]} value={form[k]} onChange={setField(k)} />
        ))}
        <button className="cta" type="submit"><span className="cta-main">Lưu từ</span></button>
      </form>

      <MiningPanel importText={importText} />

      <div className="sec-lab">Import (dán mảng JSON)</div>
      <textarea
        className="field"
        rows={4}
        placeholder='[{"c":"Chủ đề","v":"từ","m":"(n) nghĩa","e":"...","d":"...","col":"..."}]'
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="cta-ghost" style={{ marginTop: 0 }} disabled={!paste.trim()} onClick={() => runImport(paste)}>
          Import từ ô dán
        </button>
        <button className="cta-ghost" style={{ marginTop: 0 }} onClick={() => fileRef.current?.click()}>
          Import từ file .json
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>

      <div className="sec-lab">Từ của bạn ({userWords.length})</div>
      <button className="cta-ghost" style={{ marginTop: 0 }} disabled={userWords.length === 0} onClick={downloadExport}>
        Export ra file JSON
      </button>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {userWords.map((w) => (
          <div key={w.id} className="next-due" style={{ marginTop: 0 }}>
            <span className="nd-lab"><b style={{ color: "var(--text)" }}>{w.v}</b> · {w.c}</span>
            <button className="link-exit" style={{ color: "var(--red)" }} onClick={() => removeWord(w.id)}>Xoá</button>
          </div>
        ))}
        {userWords.length === 0 && <p className="empty-msg" style={{ marginTop: 4 }}>Chưa có từ nào bạn tự thêm.</p>}
      </div>
    </div>
  );
}
