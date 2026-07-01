// Trí nhớ gia sư giữa các buổi NÓI: lưu tổng kết cuối buổi (wentWell/toImprove/suggestion)
// để (a) mở đầu buổi sau nhắc lại điểm cần luyện, (b) hiện "bài tập buổi sau" ở trang chủ.
// Thuần (trừ localStorage I/O). Mỗi note: { at, topic, level, wentWell[], toImprove[], suggestion }.
export const COACH_KEY = "phrasal-coach-v1";

export function loadCoachNotes() {
  try {
    const v = JSON.parse(localStorage.getItem(COACH_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveCoachNotes(list) {
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify(list));
  } catch {
    /* localStorage không khả dụng */
  }
}

// Thêm 1 tổng kết (mới nhất lên đầu), giữ tối đa 20 buổi.
export function addCoachNote(list, note) {
  return [note, ...list].slice(0, 20);
}

// Buổi gần nhất (null nếu chưa có).
export function latestNote(list = []) {
  return list[0] || null;
}

// Chuỗi nhắc điểm cần luyện cho opener buổi sau (gộp toImprove của buổi gần nhất). "" nếu không có.
export function priorFocusText(list = []) {
  const n = latestNote(list);
  if (!n) return "";
  return (n.toImprove || []).filter(Boolean).slice(0, 2).join("; ");
}
