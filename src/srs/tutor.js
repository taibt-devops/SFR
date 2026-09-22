// Hồ sơ gia sư: attempt trong buổi + gói phân tích cuối buổi (spec §10).
// THUẦN trừ load/save; nhận `now` từ ngoài để test tất định.
export const TUTOR_KEY = "srf-tutor-v1";

const MAX_ATTEMPTS = 40; // đủ cho 1 buổi (ôn 8 + drill 5 + khó 2 + từ 6); chặn phình localStorage

export function loadTutor() {
  try {
    return JSON.parse(localStorage.getItem(TUTOR_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveTutor(store) {
  try {
    localStorage.setItem(TUTOR_KEY, JSON.stringify(store));
  } catch {
    /* localStorage không khả dụng — bỏ qua, buổi học vẫn chạy */
  }
}

export function attemptsFor(store, day) {
  return store?.[day]?.attempts || [];
}

// Ghi một lần người học nói xong. Trả store MỚI, KHÔNG mutate.
export function addAttempt(store, day, attempt, now = Date.now()) {
  if (!day || !attempt?.target) return store;
  const prev = store?.[day] || { attempts: [] };
  const list = [...(prev.attempts || []), { ...attempt, at: now }].slice(-MAX_ATTEMPTS);
  return { ...store, [day]: { ...prev, attempts: list } };
}
