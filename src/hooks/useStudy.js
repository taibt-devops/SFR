// Orchestrate phiên học: hàng đợi in-memory (session.js) + SM-2 (sm2.js) + persistence (storage.js).
// Tách business logic khỏi component (CLAUDE.md rule 6). Component chỉ gọi vào hook này.
import { useCallback, useState } from "react";
import { buildSession, review } from "../srs/sm2.js";
import { loadProgress, saveProgress, resetProgress as clearStored } from "../srs/storage.js";
import { answerQueue, currentCard, isSessionDone, nextDueAt } from "../srs/session.js";
import { loadStats, saveStats, recordReview } from "../srs/stats.js";

export function useStudy(cards) {
  const [progress, setProgress] = useState(loadProgress); // { [id]: SRstate }
  const [queue, setQueue] = useState(null); // null = chưa bắt đầu phiên
  const [total, setTotal] = useState(0);
  const [lapsedIds, setLapsedIds] = useState(() => new Set()); // thẻ từng "Chưa nhớ" trong phiên
  const [stats, setStats] = useState(loadStats); // streak/mục tiêu ngày (§5.8)

  const getState = useCallback((id) => progress[id], [progress]);

  const start = useCallback(
    (opts = {}) => {
      // opts.cards = danh sách thẻ định sẵn (vd "ôn thẻ khó", đã sắp xếp → KHÔNG build/shuffle lại).
      const q = opts.cards
        ? opts.cards.slice(0, opts.limit || opts.cards.length)
        : buildSession(cards, getState, { now: Date.now(), ...opts });
      setQueue(q);
      setTotal(q.length);
      setLapsedIds(new Set());
    },
    [cards, getState]
  );

  // Đánh giá thẻ hiện tại: cập nhật SR state (lưu lại) + cập nhật hàng đợi in-memory (C3).
  const rate = useCallback(
    (q) => {
      const card = currentCard(queue || []);
      if (!card) return;
      const now = Date.now();
      const next = review(progress[card.id], q, now);
      const map = { ...progress, [card.id]: next };
      setProgress(map);
      saveProgress(map); // state lưu lại (due = +1 ngày nếu quên) — KHÔNG quyết gặp lại trong phiên
      const ns = recordReview(stats, now); // cập nhật streak/đếm thẻ hôm nay (§5.8)
      setStats(ns);
      saveStats(ns);
      if (q < 3) setLapsedIds((s) => new Set(s).add(card.id));
      setQueue(answerQueue(queue, q)); // gặp lại trong phiên dựa hàng đợi, KHÔNG dựa due
    },
    [queue, progress, stats]
  );

  const exit = useCallback(() => setQueue(null), []);

  // Xoá toàn bộ tiến độ SR (localStorage) + reset state in-memory để dashboard cập nhật ngay.
  const resetProgress = useCallback(() => {
    clearStored();
    setProgress({});
    setQueue(null);
  }, []);

  const started = queue !== null;
  const card = started ? currentCard(queue) : null;
  const remaining = queue ? queue.length : 0;

  return {
    started,
    done: started && isSessionDone(queue),
    card,
    state: card ? progress[card.id] : null, // state đã lưu của thẻ hiện tại (cho preview nút)
    progress: { current: total - remaining, total },
    summary: { total, again: lapsedIds.size, good: total - lapsedIds.size },
    nextDue: nextDueAt(cards, getState),
    stats, // streak/mục tiêu ngày (§5.8) — Dashboard hiển thị qua streakFor/todayReviewedFor
    getState, // cho Dashboard tính thống kê theo scope
    start,
    rate,
    exit,
    resetProgress,
  };
}
