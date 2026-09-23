// Thêm từ vựng vào từ vựng của NGÀY đang học (spec §2.5).
// Ô nhập chữ ở đây KHÔNG phá C10: C10 cấm gõ chữ THAY CHO việc nói ở các nhịp luyện nói — còn đây
// là ghi lại một từ để ôn sau, không phải bài kiểm tra phát âm.

import { IcoTranslate } from "./Icon.jsx";

export default function AddWordModal({ value, onChange, onAuto, onSave, onClose }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const ok = !!value.word.trim();

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Thêm vào từ vựng hôm nay</div>

        <input
          className="inp"
          autoFocus
          placeholder="từ / cụm muốn nhớ…"
          value={value.word}
          onChange={(e) => set({ word: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && ok && onSave()}
        />

        <div className="inp-row">
          <input
            className="inp"
            placeholder="nghĩa tiếng Việt…"
            value={value.m || ""}
            onChange={(e) => set({ m: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && ok && onSave()}
          />
          <button className="btn btn-sm" title="Tự dịch nghĩa" disabled={!ok || value.mLoading} onClick={onAuto}>
            {value.mLoading ? "…" : <IcoTranslate size={16} />}
          </button>
        </div>

        <textarea
          className="inp"
          rows={2}
          placeholder="câu đã gặp từ này (dùng làm ngữ cảnh lúc ôn)…"
          value={value.en || ""}
          onChange={(e) => set({ en: e.target.value })}
        />

        <p className="muted small" style={{ margin: "2px 0 0" }}>
          Từ này sẽ quay lại ở phần <b>ôn nhanh</b> những ngày tới.
        </p>

        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={!ok} onClick={onSave}>Lưu</button>
          <button className="btn" onClick={onClose}>Huỷ</button>
        </div>
      </div>
    </div>
  );
}
