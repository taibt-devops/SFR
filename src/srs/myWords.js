// Từ NGƯỜI HỌC tự thêm trong lúc luyện nói, gắn theo NGÀY học (spec §2.5).
// THUẦN trừ load/save; nhận `now` từ ngoài để test tất định.
//
// Vì sao gắn theo ngày thay vì gom một rổ: bản cũ ném hết vào chủ đề rác "Sổ lỗi (luyện nói)" nên
// chẳng bao giờ ôn lại. Gắn theo ngày thì từ bạn vấp lúc nói chuyện quay lại ở nhịp 0 hôm sau,
// nằm chung hàng đợi với từ của bài.

export const MYWORDS_KEY = "srf-mywords-v1";

// Khoá so trùng: bỏ hoa thường + khoảng trắng thừa. "Take Away" và "take away" là một.
export function normWord(w) {
  return String(w || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function loadMyWords() {
  try {
    return JSON.parse(localStorage.getItem(MYWORDS_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveMyWords(store) {
  try {
    localStorage.setItem(MYWORDS_KEY, JSON.stringify(store));
  } catch {
    /* localStorage không khả dụng — bỏ qua, phiên vẫn chạy được */
  }
}

// Thêm một từ vào ngày `day`. Trả store MỚI, KHÔNG mutate.
// Từ rỗng → bỏ qua. Trùng (theo normWord) trong cùng ngày → cập nhật nghĩa/câu thay vì nhân đôi.
export function addMyWord(store, day, entry, now = Date.now()) {
  const w = String(entry?.w || "").trim();
  if (!w || !day) return store;
  const list = store?.[day] || [];
  const key = normWord(w);
  const next = {
    w,
    m: String(entry?.m || "").trim(),
    en: String(entry?.en || "").trim(), // câu đã gặp từ đó — làm ngữ cảnh khi ôn
    at: now,
  };
  const idx = list.findIndex((x) => normWord(x.w) === key);
  const out = idx >= 0 ? list.map((x, i) => (i === idx ? { ...x, ...next, at: x.at } : x)) : [...list, next];
  return { ...store, [day]: out };
}

export function removeMyWord(store, day, w) {
  const list = store?.[day];
  if (!list) return store;
  const key = normWord(w);
  return { ...store, [day]: list.filter((x) => normWord(x.w) !== key) };
}

export function myWordsFor(store, day) {
  return store?.[day] || [];
}

export function countMyWords(store = {}) {
  return Object.values(store).reduce((n, list) => n + (list?.length || 0), 0);
}
