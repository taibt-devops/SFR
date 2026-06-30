// Quản lý từ vựng (gọn): Mining (dán văn bản → Claude trích từ) + danh sách từ đã thêm + sao lưu.
// Bỏ form thêm/sửa tay & import JSON (ít dùng). Thêm từ KHÔNG xoá tiến độ thẻ cũ (state khớp id).
import MiningPanel from "./MiningPanel.jsx";

export default function DataManager({ userWords, importText, removeWord, exportText, onBack }) {
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

      <MiningPanel importText={importText} />

      <div className="sec-lab">Từ của bạn ({userWords.length})</div>
      {userWords.length > 0 && (
        <button className="cta-ghost" style={{ marginTop: 0 }} onClick={downloadExport}>Sao lưu ra file JSON</button>
      )}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {userWords.map((w) => (
          <div key={w.id} className="next-due" style={{ marginTop: 0 }}>
            <span className="nd-lab"><b style={{ color: "var(--text)" }}>{w.v}</b> · {w.c}</span>
            <button className="link-exit" style={{ color: "var(--red)" }} onClick={() => removeWord(w.id)}>Xoá</button>
          </div>
        ))}
        {userWords.length === 0 && <p className="empty-msg" style={{ marginTop: 4 }}>Chưa có từ nào. Dùng Mining ở trên để thêm từ từ một đoạn văn.</p>}
      </div>
    </div>
  );
}
