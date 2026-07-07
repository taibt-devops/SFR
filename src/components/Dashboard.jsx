// Màn hình chính: 4 số liệu (§1.6) + chọn chủ đề (scope) + nút "Ôn N thẻ".
// Thuần UI — dùng helper thuần computeStats/nextDueAt/buildSession (đã có test).
import { useMemo, useState } from "react";
import { buildSession } from "../srs/sm2.js";
import { computeStats, nextDueAt, hardCards } from "../srs/session.js";
import { streakFor, todayReviewedFor } from "../srs/stats.js";
import { loadSpeaking, latestLevel, assessedToday, speakingProfile, CEFR_ORDER } from "../srs/speaking.js";
import { loadCoachNotes, latestNote } from "../srs/coachMemory.js";

const DIM_VI = { fluency: "trôi chảy", lexical: "vốn từ", grammar: "ngữ pháp", pronunciation: "phát âm" };
import { dueLabel } from "../utils/format.js";

export default function Dashboard({ cards, getState, onStart, onReset, productionMode, onToggleProduction, stats, scope, onScope, level, onLevel, onStory, onVoice, onAssess, onProfile }) {
  const now = Date.now();
  const streak = streakFor(stats, now);
  const todayDone = todayReviewedFor(stats, now);
  const goal = stats?.goal || 20;
  const speakLevel = useMemo(() => latestLevel(loadSpeaking()), []);
  const lastNote = useMemo(() => latestNote(loadCoachNotes()), []); // buổi nói gần nhất (bài tập buổi sau)
  const profile = useMemo(() => speakingProfile(loadSpeaking()), []); // điểm yếu để cá nhân hoá lộ trình
  const didAssessToday = useMemo(() => assessedToday(loadSpeaking(), now), [now]);
  const reviewDone = todayDone >= goal;
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

  // ── Lộ trình cá nhân hoá theo điểm yếu (#3) — dùng dữ liệu đã có, không gọi API ──
  const weakLabel = profile?.weakestDim ? DIM_VI[profile.weakestDim] : "";
  const tagText = profile?.topTags?.slice(0, 2).map((t) => t.tag).join(", ") || "";
  const improveText = lastNote?.toImprove?.slice(0, 2).join(", ") || "";
  const focusText = tagText || improveText; // điểm cần luyện (tags gộp > toImprove buổi trước)
  const targetLabel = weakLabel ? `${weakLabel}${tagText ? ` (${tagText})` : ""}` : "";
  const voiceSub = focusText ? `tập trung: ${focusText}` : "kể tự nhiên, mình sẽ sửa nhẹ";
  const assessSub = profile
    ? `xem ${weakLabel || "khả năng nói"} lên chưa (đang ${speakLevel || "?"})`
    : "làm bài đầu tiên để biết trình độ";
  const reviewSub = hard.length > 0 ? `ưu tiên ${hard.length} thẻ khó` : undefined;

  // Luyện nói / Đánh giá bắt buộc chọn 1 chủ đề cụ thể (để từ lưu đúng topic + theo dõi CEFR theo topic).
  const [hint, setHint] = useState("");
  const needTopic = scope === "all";
  const goVoice = () => (needTopic ? setHint("Hãy chọn một chủ đề cụ thể ở trên để luyện nói.") : onVoice());
  const goAssess = () => (needTopic ? setHint("Hãy chọn một chủ đề cụ thể ở trên để đánh giá.") : onAssess());

  return (
    <div className="app">
      <div className="app-head" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="app-title">Luyện nói tiếng Anh</div>
          <div className="app-sub">Nói là chính · từ vựng làm nền · chấm CEFR</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="manage-link" onClick={goAssess}>🎯 Đánh giá</button>
          <button className="manage-link" onClick={onProfile}>📈 Tiến trình</button>
        </div>
      </div>

      {/* HERO = Thiết lập buổi học (chủ đề + trình độ) → chi phối cả ôn từ lẫn luyện nói */}
      <div className="hero">
        <div className="hero-top">
          <div className="hero-lab">Buổi học hôm nay</div>
          <div className="hero-meta">
            <span>🔥 {streak} ngày</span>
            {speakLevel && <span>🗣️ đã chấm: {speakLevel}</span>}
          </div>
        </div>
        <label className="vs-row">
          <span>Chủ đề</span>
          <span className="field-wrap" style={{ width: "62%" }}>
            {needTopic && <span className="point-hand" aria-hidden="true">👉</span>}
            <select className={`field${needTopic ? " field-attn" : ""}`} style={{ flex: 1, width: "100%" }} value={scope} onChange={(e) => { onScope(e.target.value); setHint(""); }}>
              <option value="all">Tất cả ({cards.length} từ)</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </span>
        </label>
        <label className="vs-row" style={{ marginTop: 8 }}>
          <span>Trình độ nói</span>
          <select className="field" style={{ width: "auto" }} value={level} onChange={(e) => onLevel(e.target.value)}>
            {CEFR_ORDER.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <button className="cta" style={{ marginTop: 14, opacity: needTopic ? 0.55 : 1 }} onClick={goVoice}>
          <span className="cta-main">🎙️ Luyện nói</span>
          <span className="cta-sub">{needTopic ? "chọn một chủ đề cụ thể ở trên" : "theo chủ đề & trình độ ở trên"}</span>
        </button>
        {hint && <p className="app-sub" style={{ color: "var(--amber)", marginTop: 8, marginBottom: 0 }}>{hint}</p>}
      </div>

      {/* TỪ BUỔI TRƯỚC — gia sư nhắc lại (bài tập buổi sau) */}
      {lastNote && (lastNote.suggestion || lastNote.toImprove?.length > 0) && (
        <div className="carry-note">
          <div className="carry-head">📌 Từ buổi nói trước</div>
          {lastNote.suggestion && <div className="carry-body">{lastNote.suggestion}</div>}
          {lastNote.toImprove?.length > 0 && (
            <div className="carry-sub">Cần luyện: {lastNote.toImprove.slice(0, 2).join(" · ")}</div>
          )}
        </div>
      )}

      {/* LỘ TRÌNH HÔM NAY — cá nhân hoá theo điểm yếu */}
      <div className="sec-lab">Lộ trình hôm nay{targetLabel && <span className="plan-target"> · 🎯 mục tiêu: {targetLabel}</span>}</div>
      <div className="plan">
        <PlanStep track={false} label="🎙️ Luyện nói ~5 phút" sub={voiceSub} onClick={goVoice} />
        <PlanStep done={didAssessToday} track label="🎯 Đánh giá nói 1 bài" sub={assessSub} onClick={goAssess} />
        <PlanStep done={reviewDone} track label={`📚 Ôn từ vựng — ${Math.min(todayDone, goal)}/${goal} thẻ`} sub={reviewSub} onClick={() => onStart({ scope })} />
      </div>

      {/* TỪ VỰNG — nền cho luyện nói (theo chủ đề đã chọn ở trên) */}
      <div className="sec-lab">Từ vựng {scope === "all" ? "" : `· ${scope}`}</div>
      <p className="app-sub" style={{ marginBottom: 10 }}>
        Đến hạn {counts.due} · Mới {counts.new} · Đã thuộc {counts.mastered} · tổng {cards.length} từ
      </p>
      <label className="prod-toggle">
        <input type="checkbox" checked={productionMode} onChange={onToggleProduction} />
        Chế độ chuyên sâu — ép tự đặt câu mọi thẻ
      </label>
      <p className="app-sub" style={{ marginTop: 4 }}>
        Bật khi từ đã quen. Để tắt thì app tự chọn kiểu ôn theo độ thuộc (từ mới → nhận diện, thuộc dần → tự đặt câu).
      </p>
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

function PlanStep({ done, track = true, label, sub, onClick }) {
  return (
    <button className={`plan-step ${done ? "plan-done" : ""}`} onClick={onClick}>
      <span className="plan-check">{track ? (done ? "✓" : "") : "·"}</span>
      <span className="plan-label">
        {label}
        {sub && <span className="plan-sub">{sub}</span>}
      </span>
      <span className="plan-go">{done ? "" : "→"}</span>
    </button>
  );
}
