// Màn hình chính: 4 số liệu (§1.6) + chọn chủ đề (scope) + nút "Ôn N thẻ".
// Thuần UI — dùng helper thuần computeStats/nextDueAt/buildSession (đã có test).
import { useMemo, useState } from "react";
import { buildSession } from "../srs/sm2.js";
import { computeStats, nextDueAt, hardCards } from "../srs/session.js";
import { streakFor, todayReviewedFor } from "../srs/stats.js";
import { loadSpeaking, latestLevel } from "../srs/speaking.js";
import { dueLabel } from "../utils/format.js";

export default function Dashboard({ cards, getState, onStart, onManage, onReset, productionMode, onToggleProduction, stats, onStory, onVoice, onAssess, onProfile }) {
  const now = Date.now();
  const streak = streakFor(stats, now);
  const todayDone = todayReviewedFor(stats, now);
  const goal = stats?.goal || 20;
  const speakLevel = useMemo(() => latestLevel(loadSpeaking()), []);
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
          <div className="app-title">SRF — Luyện từ vựng</div>
          <div className="app-sub">{cards.length} thẻ · {topics.length} chủ đề</div>
        </div>
        <button className="manage-link" onClick={onManage}>Quản lý từ</button>
      </div>

      <div className="streak-bar">
        <span>🔥 Chuỗi {streak} ngày</span>
        <span>Hôm nay {Math.min(todayDone, goal)}/{goal}</span>
        {speakLevel && <span onClick={onProfile} style={{ cursor: "pointer" }}>🗣️ Nói: {speakLevel}</span>}
      </div>
      <div className="streak-bar" style={{ marginTop: 8 }}>
        <button className="manage-link" onClick={onAssess}>🎙️ Đánh giá nói</button>
        <button className="manage-link" onClick={onProfile}>📈 Tiến trình</button>
        <button className="manage-link" onClick={onVoice}>Luyện nói</button>
        <button className="manage-link" onClick={onStory}>Mini-story</button>
      </div>

      <div className="stat-grid">
        <div className="stat stat-due"><div className="stat-num">{counts.due}</div><div className="stat-lab">Đến hạn hôm nay</div></div>
        <div className="stat"><div className="stat-num">{counts.new}</div><div className="stat-lab">Thẻ mới</div></div>
        <div className="stat"><div className="stat-num">{counts.learning}</div><div className="stat-lab">Đang học</div></div>
        <div className="stat"><div className="stat-num">{counts.mastered}</div><div className="stat-lab">Đã thuộc</div></div>
      </div>

      <div className="sec-lab">Chủ đề</div>
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

      <div className="spacer" />

      {total > 0 ? (
        <button className="cta" onClick={() => onStart({ scope })}>
          <span className="cta-main">Ôn {total} thẻ</span>
          <span className="cta-sub">{sessionNew} mới + {sessionDue} ôn lại</span>
        </button>
      ) : (
        <p className="empty-msg">
          Không có thẻ đến hạn trong phạm vi này.
          <br />Thẻ đến hạn kế tiếp: <b>{dueLabel(nextDue)}</b>
        </p>
      )}

      {hard.length > 0 && (
        <button className="cta-ghost" onClick={() => onStart({ cards: hard })}>
          🔁 Ôn thẻ khó ({hard.length}) — từ hay quên
        </button>
      )}

      <button
        className="link-exit"
        style={{ alignSelf: "center", marginTop: 16 }}
        onClick={() => {
          if (window.confirm("Đặt lại TOÀN BỘ tiến độ ôn? Hành động này không thể hoàn tác (từ vựng vẫn giữ nguyên).")) onReset();
        }}
      >
        Đặt lại tiến độ
      </button>
    </div>
  );
}
