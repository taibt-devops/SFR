// Hồ sơ tiến trình NÓI (GĐ2): biểu đồ CEFR theo thời gian + mức từng trục + top lỗi hay lặp + khu vực cần tập trung.
import { useMemo } from "react";
import { loadSpeaking, speakingProfile } from "../srs/speaking.js";

const DIM_LABEL = { fluency: "Trôi chảy", lexical: "Vốn từ", grammar: "Ngữ pháp", pronunciation: "Phát âm" };

export default function SpeakingProfile({ onBack, onAssess }) {
  const p = useMemo(() => speakingProfile(loadSpeaking()), []);
  const maxTag = p?.topTags[0]?.count || 1;

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Tiến trình nói</span>
        <button className="link-exit" onClick={onBack}>← Về</button>
      </div>

      {!p ? (
        <p className="empty-msg">
          Chưa có bài đánh giá nào.<br />
          <button className="link-exit" onClick={onAssess}>🎙️ Bắt đầu đánh giá nói</button>
        </p>
      ) : (
        <>
          <div className="assess-level" style={{ marginTop: 14 }}>
            <div className="assess-cefr">{p.currentCefr}</div>
            <div className="assess-sum">Trình độ nói hiện tại · đã đánh giá {p.count} bài</div>
          </div>

          <div className="sec-lab">Tiến bộ (CEFR qua các bài)</div>
          {p.trend.length > 1 ? (
            <div className="trend">
              {p.trend.map((t, i) => (
                <div key={i} className="trend-bar" style={{ height: `${(t.idx / 6) * 100}%` }}>
                  <span>{t.cefr}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="app-sub">Cần thêm bài để thấy xu hướng (mới có {p.trend.length}).</p>
          )}

          <div className="sec-lab">Mức từng trục (bài gần nhất)</div>
          {["fluency", "lexical", "grammar", "pronunciation"].map((k) =>
            p.dims[k] ? (
              <div key={k} className="next-due" style={{ marginTop: 6 }}>
                <span className="nd-lab"><b style={{ color: "var(--text)" }}>{DIM_LABEL[k]}</b>{p.weakestDim === k ? " · cần tập trung" : ""}</span>
                <span className="nd-val">{p.dims[k].level}</span>
              </div>
            ) : null
          )}

          <div className="sec-lab">Lỗi hay lặp</div>
          {p.topTags.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {p.topTags.map((t) => (
                <div key={t.tag} className="tag-row">
                  <span className="tag-name">{t.tag}</span>
                  <span className="tag-bar"><i style={{ width: `${(t.count / maxTag) * 100}%` }} /></span>
                  <span className="tag-count">{t.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="app-sub">Chưa ghi nhận lỗi lặp — tốt!</p>
          )}

          {(p.weakestDim || p.topTags.length) && (
            <p className="empty-msg" style={{ marginTop: 18, textAlign: "left", color: "var(--text)" }}>
              👉 <b>Nên tập trung:</b>{" "}
              {p.weakestDim ? DIM_LABEL[p.weakestDim] : ""}
              {p.topTags.length ? ` · lỗi hay lặp: ${p.topTags.slice(0, 2).map((t) => t.tag).join(", ")}` : ""}.
            </p>
          )}

          <div className="spacer" />
          <button className="cta" onClick={onAssess}><span className="cta-main">🎙️ Đánh giá bài mới</span></button>
        </>
      )}
    </div>
  );
}
