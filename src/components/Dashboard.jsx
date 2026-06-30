// Màn hình chính: 4 số liệu (§1.6) + chọn chủ đề (scope) + nút "Ôn N thẻ".
// Thuần UI — dùng helper thuần computeStats/nextDueAt/buildSession (đã có test).
import { useMemo, useState } from "react";
import { buildSession } from "../srs/sm2.js";
import { computeStats, nextDueAt, hardCards } from "../srs/session.js";
import { streakFor, todayReviewedFor } from "../srs/stats.js";
import { loadSpeaking, latestLevel, assessedToday } from "../srs/speaking.js";
import { dueLabel } from "../utils/format.js";

export default function Dashboard({ cards, getState, onStart, onManage, onReset, productionMode, onToggleProduction, stats, onStory, onVoice, onAssess, onProfile }) {
  const now = Date.now();
  const streak = streakFor(stats, now);
  const todayDone = todayReviewedFor(stats, now);
  const goal = stats?.goal || 20;
  const speakLevel = useMemo(() => latestLevel(loadSpeaking()), []);
  const didAssessToday = useMemo(() => assessedToday(loadSpeaking(), now), [now]);
  const reviewDone = todayDone >= goal;
  const [scope, setScope] = useState("all");
  const topics = useMemo(() => [...new Set(cards.map((c) => c.c))], [cards]);

  const { counts, sessionNew, sessionDue, nextDue, hard } = useMemo(() => {
    const now = Date.now();
    const scoped = scope === "all" ? cards : cards.filter((c) => c.c === scope);
    // Số sẽ thực sự vào phiên = buildSession (tôn trọng newLimit/maxReviews) — nguồn chân lý duy nhất.
    const plan = buildSession(cards, getState, { scope, now });
    let sNew = 0;
    for (const c of plan) {
      const st = getState(c.id);
      if (!st || !st.seen) sNew++;
    }
    return {
      counts: computeStats(scoped, getState, now),
      sessionNew: sNew,
      sessionDue: plan.length - sNew,
      nextDue: nextDueAt(scoped, getState),
      hard: hardCards(scoped, getState, { limit: 20 }),
    };
  }, [cards, getState, scope]);

  const total = sessionNew + sessionDue;

  return (
    <div className="app">
      <div className="app-head" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="app-title">Luyện nói tiếng Anh</div>
          <div className="app-sub">Nói là chính · từ vựng làm nền · chấm CEFR</div>
        </div>
        <button className="manage-link" onClick={onManage}>Từ vựng</button>
      </div>

      {/* HERO: luyện nói */}
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="hero-lab">Trình độ nói</div>
            <div className="hero-level">{speakLevel || "—"}</div>
          </div>
          <div className="hero-meta">
            <span>🔥 {streak} ngày</span>
            <span>Hôm nay {Math.min(todayDone, goal)}/{goal} thẻ</span>
          </div>
        </div>
        <button className="cta" onClick={onVoice}>
          <span className="cta-main">🎙️ Luyện nói</span>
          <span className="cta-sub">hội thoại với gia sư AI</span>
        </button>
        <div className="btn-row">
          <button className="cta-ghost cta-accent" onClick={onAssess}>🎯 Đánh giá CEFR</button>
          <button className="cta-ghost" onClick={onProfile}>📈 Tiến trình</button>
        </div>
      </div>

      {/* LỘ TRÌNH HÔM NAY */}
      <div className="sec-lab">Lộ trình hôm nay</div>
      <div className="plan">
        <PlanStep track={false} label="🎙️ Luyện nói (hội thoại) ~5 phút" onClick={onVoice} />
        <PlanStep done={didAssessToday} track label="🎯 Đánh giá nói 1 bài (theo dõi CEFR)" onClick={onAssess} />
        <PlanStep done={reviewDone} track label={`📚 Ôn từ vựng — ${Math.min(todayDone, goal)}/${goal} thẻ`} onClick={() => onStart({})} />
      </div>

      {/* TỪ VỰNG — nền cho luyện nói (phụ) */}
      <div className="sec-lab">Từ vựng — nền cho luyện nói</div>
      <p className="app-sub" style={{ marginBottom: 10 }}>
        Đến hạn {counts.due} · Mới {counts.new} · Đã thuộc {counts.mastered} · tổng {cards.length} từ
      </p>
      <select className="field" value={scope} onChange={(e) => setScope(e.target.value)}>
        <option value="all">Tất cả ({cards.length} thẻ)</option>
        {topics.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <label className="prod-toggle">
        <input type="checkbox" checked={productionMode} onChange={onToggleProduction} />
        Tự đặt câu trước khi xem đáp án (luyện chủ động)
      </label>
      {total > 0 ? (
        <button className="cta-ghost cta-accent" onClick={() => onStart({ scope })}>
          Ôn {total} thẻ · {sessionNew} mới + {sessionDue} ôn lại
        </button>
      ) : (
        <p className="app-sub" style={{ marginTop: 9 }}>Không có thẻ đến hạn · kế tiếp: <b>{dueLabel(nextDue)}</b></p>
      )}
      {hard.length > 0 && (
        <button className="cta-ghost" onClick={() => onStart({ cards: hard })}>🔁 Ôn thẻ khó ({hard.length})</button>
      )}

      <button className="manage-link" style={{ alignSelf: "center", marginTop: 16 }} onClick={onStory}>📖 Mini-story hôm nay</button>
      <p className="app-sub" style={{ textAlign: "center", marginTop: 12 }}>
        Nhịp tuần: nói + ôn từ mỗi ngày · đánh giá CEFR 2–3 lần/tuần · cuối tuần xem 📈 Tiến trình để chọn điểm cần luyện.
      </p>
      <button
        className="link-exit"
        style={{ alignSelf: "center", marginTop: 14 }}
        onClick={() => {
          if (window.confirm("Đặt lại TOÀN BỘ tiến độ ôn? Hành động này không thể hoàn tác (từ vựng vẫn giữ nguyên).")) onReset();
        }}
      >
        Đặt lại tiến độ
      </button>
    </div>
  );
}

function PlanStep({ done, track = true, label, onClick }) {
  return (
    <button className={`plan-step ${done ? "plan-done" : ""}`} onClick={onClick}>
      <span className="plan-check">{track ? (done ? "✓" : "") : "·"}</span>
      <span className="plan-label">{label}</span>
      <span className="plan-go">{done ? "" : "→"}</span>
    </button>
  );
}
