// Lưu lịch sử đánh giá NÓI (GĐ1) vào localStorage. Mỗi entry: { at, cefr, dims, strengths, weaknesses, fixes, task, stats }.
export const SPEAKING_KEY = "phrasal-speaking-v1";
export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function loadSpeaking() {
  try {
    const v = JSON.parse(localStorage.getItem(SPEAKING_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveSpeaking(list) {
  try {
    localStorage.setItem(SPEAKING_KEY, JSON.stringify(list));
  } catch {
    /* localStorage không khả dụng */
  }
}

// Thêm 1 lần đánh giá (mới nhất lên đầu), giữ tối đa 100 bài.
export function addAssessment(list, entry) {
  return [entry, ...list].slice(0, 100);
}

// Các bài đánh giá thuộc 1 chủ đề (topicId = danh mục từ vựng, hoặc "" cho chủ đề tự do/Tất cả).
export function assessmentsForTopic(list = [], topicId) {
  return list.filter((e) => (e?.topic || "") === (topicId || ""));
}

// Mức nói hiện tại = lần đánh giá gần nhất hợp lệ (theo CEFR_ORDER).
export function latestLevel(list) {
  const hit = list.find((e) => CEFR_ORDER.includes(e?.cefr));
  return hit ? hit.cefr : null;
}

// Hôm nay đã đánh giá nói chưa (cho "Lộ trình hôm nay"). now truyền vào để test tất định.
export function assessedToday(list = [], now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const start = d.getTime();
  return list.some((e) => typeof e?.at === "number" && e.at >= start);
}

// A1→1 … C2→6 (null nếu không hợp lệ) — để vẽ biểu đồ & so sánh trục.
export function cefrIndex(cefr) {
  const i = CEFR_ORDER.indexOf(cefr);
  return i < 0 ? null : i + 1;
}

// Hồ sơ tiến trình nói (GĐ2): trend CEFR, mức từng trục (lần gần nhất), top lỗi hay lặp (gom tags).
// list: mới nhất ở đầu (như addAssessment). Trả null nếu chưa có bài.
export function speakingProfile(list = []) {
  if (!list.length) return null;
  const valid = list.filter((e) => CEFR_ORDER.includes(e?.cefr));
  const latest = valid[0] || list[0];

  // Trend: tối đa 12 bài gần nhất, sắp CŨ → MỚI để vẽ trái→phải.
  const trend = valid
    .slice(0, 12)
    .reverse()
    .map((e) => ({ at: e.at, cefr: e.cefr, idx: cefrIndex(e.cefr) }));

  // Top lỗi hay lặp: đếm tags qua tất cả bài.
  const counts = {};
  for (const e of list) {
    for (const t of e?.tags || []) {
      const k = String(t).trim();
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
  }
  const topTags = Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Trục yếu nhất (theo lần gần nhất) — để gợi ý "cần tập trung".
  const dims = latest?.dims || {};
  let weakestDim = null;
  let weakestIdx = Infinity;
  for (const k of ["fluency", "lexical", "grammar", "pronunciation"]) {
    const idx = cefrIndex(dims[k]?.level);
    if (idx != null && idx < weakestIdx) {
      weakestIdx = idx;
      weakestDim = k;
    }
  }

  return { count: list.length, currentCefr: latest?.cefr || "?", trend, dims, topTags, weakestDim };
}
