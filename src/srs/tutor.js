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

// Bảng nhãn lỗi — DÙNG LẠI đúng bảng của server/proxy.mjs#handleAssess.
// Đặt bảng mới sẽ chẻ đôi hồ sơ: cùng lỗi mạo từ mà hai nguồn đếm vào hai khoá khác nhau.
export const ERROR_TAGS = [
  "mạo từ",
  "chia động từ/thì",
  "số ít-số nhiều",
  "giới từ",
  "trật tự từ",
  "từ vựng hạn chế",
  "liên kết-mạch lạc",
  "phát âm",
  "ngập ngừng-trôi chảy",
];

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Lọc gói Claude trả về. Sai khuôn → null; sai từng phần → bỏ phần đó, giữ phần còn lại.
export function sanitizeAnalysis(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const errors = (Array.isArray(raw.errors) ? raw.errors : [])
    .filter((e) => e && ERROR_TAGS.includes(e.tag))
    .map((e) => ({ tag: e.tag, vi: str(e.vi), evidence: str(e.evidence), fix: str(e.fix) }));
  const drills = (Array.isArray(raw.drills) ? raw.drills : [])
    .filter((d) => d && str(d.vi) && str(d.en))
    .map((d) => ({ vi: str(d.vi), en: str(d.en) }))
    .slice(0, 2);
  const hints = (Array.isArray(raw.hints) ? raw.hints : [])
    .filter((h) => h && str(h.itemId) && Number.isInteger(h.q) && h.q >= 2 && h.q <= 5)
    .map((h) => ({ itemId: str(h.itemId), q: h.q, why: str(h.why) }));
  const strengths = (Array.isArray(raw.strengths) ? raw.strengths : []).map(str).filter(Boolean);
  return { errors, strengths, focus: str(raw.focus), drills, hints };
}

export function analysisFor(store, day) {
  return store?.[day]?.analysis || null;
}

export function setAnalysis(store, day, raw, now = Date.now()) {
  const prev = store?.[day] || { attempts: [] };
  return { ...store, [day]: { ...prev, analysis: sanitizeAnalysis(raw), at: now } };
}
