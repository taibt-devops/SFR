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

// Mức nói hiện tại = lần đánh giá gần nhất hợp lệ (theo CEFR_ORDER).
export function latestLevel(list) {
  const hit = list.find((e) => CEFR_ORDER.includes(e?.cefr));
  return hit ? hit.cefr : null;
}
