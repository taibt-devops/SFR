// Động lực học (§5.8): streak ngày + đếm thẻ hôm nay + mục tiêu ngày. Thuần (trừ localStorage I/O).
// Nhận `now` từ ngoài (không gọi Date.now() trong logic lõi) để test tất định.
import { DAY } from "./sm2.js";

export const STATS_KEY = "phrasal-stats-v1";
export const DEFAULT_GOAL = 20;

export function emptyStats() {
  return { streak: 0, lastDay: 0, todayReviewed: 0, goal: DEFAULT_GOAL };
}

// Mốc 00:00 (giờ địa phương) của timestamp → so sánh "cùng ngày".
function dayStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Gọi mỗi lần đánh giá 1 thẻ. Cập nhật streak (ngày mới liên tiếp +1, đứt thì về 1) + đếm thẻ hôm nay.
export function recordReview(stats, now) {
  const s = { ...emptyStats(), ...(stats || {}) };
  const today = dayStart(now);
  if (s.lastDay === today) return { ...s, todayReviewed: s.todayReviewed + 1 };
  const yesterday = dayStart(now - DAY);
  return { ...s, lastDay: today, todayReviewed: 1, streak: s.lastDay === yesterday ? s.streak + 1 : 1 };
}

// Hiển thị (theo `now`): số thẻ đã ôn hôm nay (0 nếu lastDay không phải hôm nay).
export function todayReviewedFor(stats, now) {
  const s = stats || emptyStats();
  return s.lastDay === dayStart(now) ? s.todayReviewed : 0;
}

// Streak còn "sống" nếu lần học gần nhất là hôm nay hoặc hôm qua; cũ hơn → đứt (0).
export function streakFor(stats, now) {
  const s = stats || emptyStats();
  return s.lastDay === dayStart(now) || s.lastDay === dayStart(now - DAY) ? s.streak : 0;
}

export function loadStats() {
  try {
    return { ...emptyStats(), ...(JSON.parse(localStorage.getItem(STATS_KEY)) || {}) };
  } catch {
    return emptyStats();
  }
}
export function saveStats(s) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* localStorage không khả dụng — bỏ qua */
  }
}
