// Logic phiên học: hàng đợi IN-MEMORY (tách khỏi state đã lưu) + thống kê.
// Source of truth: spec §1.4 (hàng đợi, constraint C3) và §1.6 (thống kê). Thuần, KHÔNG React/DOM.
import { isDue } from "./sm2.js";

export const MASTERED_INTERVAL = 21; // ngày: interval ≥ ngưỡng này = "đã thuộc" (§1.6, có thể chỉnh)

// ───────── Hàng đợi in-memory (C3) ─────────
// queue = mảng card còn phải xử lý TRONG phiên hiện tại. KHÔNG dựa `due` để quyết "gặp lại":
//   • "Chưa nhớ" (q < 3) → đẩy card về CUỐI queue (gặp lại ngay trong phiên).
//   • Khó/Tốt/Dễ (q ≥ 3) → loại card khỏi queue.
// Luôn trả về mảng MỚI (không mutate input) để dùng an toàn với state React.

export function currentCard(queue) {
  return queue.length ? queue[0] : null;
}

export function answerQueue(queue, q) {
  if (!queue.length) return queue;
  const [head, ...rest] = queue;
  return q < 3 ? [...rest, head] : rest;
}

export function isSessionDone(queue) {
  return queue.length === 0;
}

// ───────── Thống kê (§1.6) ─────────
// Mỗi nhóm theo ĐÚNG điều kiện spec; các nhóm CÓ THỂ chồng nhau — vd thẻ mới cũng tính "đến hạn"
// vì isDue(thẻ mới) === true (spec §1.6 định nghĩa "Đến hạn" = isDue === true).
export function computeStats(cards, getState, now = Date.now()) {
  let fresh = 0;
  let learning = 0;
  let mastered = 0;
  let due = 0;
  for (const c of cards) {
    const st = getState(c.id);
    if (!st || !st.seen) fresh++;
    else if (st.interval < MASTERED_INTERVAL) learning++;
    else mastered++;
    if (isDue(st, now)) due++;
  }
  return { new: fresh, learning, mastered, due };
}

// Thời điểm đến hạn kế tiếp = min(`due`) trong các thẻ đã `seen` — cho màn "hoàn thành"/dashboard
// khi không còn thẻ đến hạn. Trả null nếu chưa có thẻ nào seen.
export function nextDueAt(cards, getState) {
  let min = null;
  for (const c of cards) {
    const st = getState(c.id);
    if (st && st.seen && typeof st.due === "number" && (min === null || st.due < min)) {
      min = st.due;
    }
  }
  return min;
}
