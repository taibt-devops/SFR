// Chi tiết 1 CHỦ ĐỀ: từ vựng (thuộc/đang học/chưa học) · khả năng nói (CEFR + cần cải thiện) ·
// mẫu câu gợi ý · và các hành động (đánh giá / luyện nói / ôn từ) — đều scoped theo chủ đề.
import { useMemo, useState } from "react";
import { computeStats } from "../srs/session.js";
import { loadSpeaking, speakingProfile, assessmentsForTopic } from "../srs/speaking.js";
import { getPatterns, cachedPatterns } from "../ai/patterns.js";

const DIM = { fluency: "Trôi chảy", lexical: "Vốn từ", grammar: "Ngữ pháp", pronunciation: "Phát âm" };

function speak(t) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "en-US";
    speechSynthesis.speak(u);
  } catch {
    /* không hỗ trợ TTS */
  }
}

export default function TopicDetail({ topic, cards, getState, onBack, onAssess, onVoice, onReview }) {
  const vocab = useMemo(() => {
    const inTopic = cards.filter((c) => c.c === topic);
    return { ...computeStats(inTopic, getState, Date.now()), total: inTopic.length };
  }, [cards, getState, topic]);

  const prof = useMemo(() => speakingProfile(assessmentsForTopic(loadSpeaking(), topic)), [topic]);
  const level = prof?.currentCefr && prof.currentCefr !== "?" ? prof.currentCefr : "A2";

  const [patterns, setPatterns] = useState(() => cachedPatterns(topic, level));
  const [patStatus, setPatStatus] = useState("idle"); // idle | loading | error

  async function loadPatterns() {
    setPatStatus("loading");
    try {
      setPatterns(await getPatterns(topic, level));
      setPatStatus("idle");
    } catch (e) {
      setPatStatus("error:" + String(e.message || e));
    }
  }

  return (
    <div className="app">
      <div className="study-top">
        <span className="app-title" style={{ fontSize: 17 }}>{topic}</span>
        <button className="link-exit" onClick={onBack}>← Tiến trình</button>
      </div>

      {/* TỪ VỰNG */}
      <div className="sec-lab">Từ vựng chủ đề</div>
      <div className="stat-grid">
        <div className="stat stat-due"><div className="stat-num">{vocab.mastered}</div><div className="stat-lab">Đã thuộc</div></div>
        <div className="stat"><div className="stat-num">{vocab.learning}</div><div className="stat-lab">Đang học</div></div>
        <div className="stat"><div className="stat-num">{vocab.new}</div><div className="stat-lab">Chưa học</div></div>
        <div className="stat"><div className="stat-num">{vocab.total}</div><div className="stat-lab">Tổng từ</div></div>
      </div>
      <button className="cta-ghost" onClick={() => onReview(topic)}>📚 Ôn từ chủ đề này</button>

      {/* KHẢ NĂNG NÓI */}
      <div className="sec-lab">Khả năng nói</div>
      {prof ? (
        <>
          <div className="assess-level">
            <div className="assess-cefr">{prof.currentCefr}</div>
            <div className="assess-sum">Đã đánh giá {prof.count} bài cho chủ đề này</div>
          </div>
          {["fluency", "lexical", "grammar", "pronunciation"].map((k) =>
            prof.dims[k] ? (
              <div key={k} className="next-due" style={{ marginTop: 6 }}>
                <span className="nd-lab"><b style={{ color: "var(--text)" }}>{DIM[k]}</b>{prof.weakestDim === k ? " · cần cải thiện" : ""}</span>
                <span className="nd-val">{prof.dims[k].level}</span>
              </div>
            ) : null
          )}
          {prof.topTags.length > 0 && (
            <p className="app-sub" style={{ marginTop: 10 }}>Lỗi hay lặp: {prof.topTags.slice(0, 3).map((t) => t.tag).join(", ")}</p>
          )}
        </>
      ) : (
        <p className="app-sub">Chưa đánh giá nói cho chủ đề này — làm 1 bài để biết mình ở đâu.</p>
      )}
      <div className="btn-row">
        <button className="cta-ghost cta-accent" onClick={() => onAssess(topic)}>🎯 Đánh giá nói</button>
        <button className="cta-ghost" onClick={() => onVoice(topic)}>🎙️ Luyện nói</button>
      </div>

      {/* MẪU CÂU */}
      <div className="sec-lab">Mẫu câu cho chủ đề (mức {level})</div>
      {!patterns && patStatus !== "loading" && (
        <button className="cta-ghost" onClick={loadPatterns}>Gợi ý mẫu câu</button>
      )}
      {patStatus === "loading" && <p className="empty-msg">Đang tạo mẫu câu…</p>}
      {patStatus.startsWith("error") && (
        <p className="empty-msg" style={{ color: "var(--red)" }}>{patStatus.slice(6)}<br /><button className="link-exit" onClick={loadPatterns}>Thử lại</button></p>
      )}
      {patterns && patterns.map((p, i) => (
        <div key={i} className="next-due" style={{ marginTop: 6 }}>
          <span className="nd-lab"><b style={{ color: "var(--text)" }}>{p.en}</b><br />{p.vi}</span>
          <button className="link-exit" onClick={() => speak(p.en)}>🔊</button>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
