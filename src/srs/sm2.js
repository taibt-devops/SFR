// SM-2 engine — thuần (pure), KHÔNG phụ thuộc React/DOM.
// Source of truth: Lo_trinh_Spaced_Repetition_Flashcard.md §1.3–1.4 (constraints C1, C3).

export const DAY = 24 * 60 * 60 * 1000;
export const MIN_EF = 1.3;

// q: 2 = Chưa nhớ, 3 = Khó, 4 = Tốt, 5 = Dễ.
// Trả về OBJECT MỚI — KHÔNG mutate `state` đầu vào (nhờ destructuring ra biến cục bộ).
export function review(state, q, now = Date.now()) {
  let { ef = 2.5, reps = 0, interval = 0, lapses = 0 } = state || {};

  if (q < 3) {
    // quên → học lại
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    if (reps === 0) interval = 1; // lần đúng đầu  → 1 ngày
    else if (reps === 1) interval = 6; // lần đúng thứ hai → 6 ngày
    else interval = Math.round(interval * ef); // sau đó: nhân ef
    reps += 1;
  }

  // EF cập nhật cho MỌI q (kể cả quên) — chủ ý theo SM-2 gốc.
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < MIN_EF) ef = MIN_EF;

  return {
    ef,
    reps,
    interval,
    lapses,
    due: now + interval * DAY,
    lastReviewed: now,
    seen: true,
  };
}

// Xem trước số ngày của một nút mà KHÔNG ghi đè state.
export function preview(state, q) {
  return review(state, q).interval;
}

export function isDue(state, now = Date.now()) {
  if (!state || !state.seen) return true; // thẻ mới luôn sẵn sàng
  return state.due <= now;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// newLimit: trần thẻ MỚI mỗi phiên; maxReviews: trần thẻ ĐẾN HẠN mỗi phiên.
// `now` truyền vào (KHÔNG gọi Date.now() bên trong) để test tất định & nhất quán với isDue.
// Ưu tiên thẻ đến hạn trước, thẻ mới sau; chỉ shuffle TRONG mỗi nhóm.
export function buildSession(
  cards,
  getState,
  { newLimit = 20, maxReviews = 100, scope = "all", now = Date.now() } = {}
) {
  const inScope = scope === "all" ? cards : cards.filter((c) => c.c === scope);
  const dueCards = [];
  const freshCards = [];
  for (const c of inScope) {
    const st = getState(c.id);
    if (!st || !st.seen) freshCards.push(c);
    else if (isDue(st, now)) dueCards.push(c);
  }
  return [
    ...shuffle(dueCards).slice(0, maxReviews),
    ...shuffle(freshCards).slice(0, newLimit),
  ];
}
