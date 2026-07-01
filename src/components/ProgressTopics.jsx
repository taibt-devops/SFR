// Tiến trình → danh sách CHỦ ĐỀ. Mỗi chủ đề: số từ đã thuộc/tổng + CEFR (nếu đã đánh giá). Chạm → chi tiết.
import { useMemo } from "react";
import { loadSpeaking, latestLevel, assessmentsForTopic } from "../srs/speaking.js";

export default function ProgressTopics({ cards, getState, onBack, onTopic }) {
  const list = useMemo(() => loadSpeaking(), []);
  const rows = useMemo(() => {
    const m = {};
    for (const c of cards) {
      const t = c.c;
      if (!m[t]) m[t] = { topic: t, total: 0, seen: 0, mastered: 0 };
      m[t].total++;
      const st = getState(c.id);
      if (st?.seen) {
        m[t].seen++;
        if ((st.interval || 0) >= 21) m[t].mastered++;
      }
    }
    const arr = Object.values(m).map((r) => ({ ...r, cefr: latestLevel(assessmentsForTopic(list, r.topic)) }));
    // Ưu tiên: đã đánh giá nói > đã học từ nhiều > A→Z.
    arr.sort((a, b) => Number(!!b.cefr) - Number(!!a.cefr) || b.seen - a.seen || a.topic.localeCompare(b.topic));
    return arr;
  }, [cards, getState, list]);

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title">Tiến trình</span>
        <button className="link-exit" onClick={onBack}>← Về</button>
      </div>
      <p className="app-sub" style={{ marginTop: 6 }}>Chọn chủ đề để xem đã luyện được gì.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
        {rows.map((r) => (
          <button key={r.topic} className="topic-row" onClick={() => onTopic(r.topic)}>
            <span className="topic-name">{r.topic}</span>
            <span className="topic-meta">
              {r.cefr && <span className="topic-cefr">{r.cefr}</span>}
              <span>{r.mastered}/{r.total} thuộc</span>
              <span className="plan-go">→</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
