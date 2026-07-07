// Kiểu ôn đa dạng (spec §5.1). THUẦN — không React, không SM-2. Suy ra từ field {v,m,e,d,col}.
// KHÔNG đổi công thức SM-2: chỉ đổi CÁCH HỎI. q vẫn do người học quyết; auto-chấm chỉ GỢI Ý q.

import { matchSpoken } from "../utils/voiceMatch.js";

export const CARD_TYPES = ["recall", "cloze", "listen", "produce", "reverse", "speak"];

// Kiểu auto-chấm (người học gõ đáp án → so khớp). Còn lại tự chấm thủ công (4 nút).
export function isAutoGraded(type) {
  return type === "cloze" || type === "listen";
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Sinh cloze từ câu ví dụ `e`: khoét token `v` (case-insensitive, theo ranh giới từ) thành "____".
// Trả { text, answer } hoặc null nếu `v` KHÔNG xuất hiện nguyên dạng trong `e` (→ caller fallback recall).
export function makeCloze(card) {
  const { v, e } = card || {};
  if (!v || !e) return null;
  const re = new RegExp(`\\b${escapeRegExp(v)}\\b`, "i");
  const m = e.match(re);
  if (!m) return null;
  return { text: e.replace(re, "____"), answer: m[0] };
}

// Chuẩn hoá để so khớp: trim, lowercase, gộp khoảng trắng.
export function normalize(s) {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// So đáp án người học gõ với đáp án đúng (bỏ hoa thường/khoảng trắng). Rỗng = sai.
export function checkAnswer(input, expected) {
  const a = normalize(input);
  return a !== "" && a === normalize(expected);
}

// Gợi ý q theo kết quả auto-chấm: sai → 2 (Chưa nhớ); đúng → null (để người học chọn ở 4 nút).
export function suggestedQ(correct) {
  return correct ? null : 2;
}

// "speak": nhìn nghĩa `m` → nói từ vào mic. Đúng khi transcript Whisper chứa NGUYÊN VĂN `v`
// (bỏ hoa thường/dấu câu — mượn matchSpoken). Chỉ GỢI Ý q, không chấm SM-2.
export function checkSpokenWord(heard, v) {
  return matchSpoken(heard, [String(v ?? "")]).length > 0;
}

// Các kiểu HỢP LỆ cho 1 thẻ (cloze chỉ khi sinh được; reverse cần bản dịch `d`; speak cần nghĩa `m`).
export function availableTypes(card) {
  const types = ["recall", "produce", "listen"];
  if (card?.d) types.push("reverse");
  if (makeCloze(card)) types.push("cloze");
  if (card?.m) types.push("speak");
  return types;
}

// Chọn kiểu tất định theo `seed` (vd vị trí thẻ trong phiên) trong các kiểu hợp lệ. Test được.
export function pickType(card, seed = 0) {
  const t = availableTypes(card);
  const i = ((Math.floor(seed) % t.length) + t.length) % t.length;
  return t[i];
}

// Chọn kiểu theo ĐỘ THUỘC (adaptive) từ SR state đã lưu — KHÔNG ghi ngược vào state (chỉ đổi CÁCH HỎI).
//  • Mới / vừa quên (reps < 1)  → nhận diện nhẹ: recall, listen
//  • Đang học (reps 1–2)        → gợi nhớ trong ngữ cảnh: cloze, recall, speak
//  • Đã cứng (reps ≥ 3)         → sản xuất: produce, reverse, speak
// Chỉ lấy kiểu HỢP LỆ cho thẻ; nếu tầng không có kiểu nào hợp lệ → fallback mọi kiểu hợp lệ. Tất định theo seed.
export function pickAdaptiveType(card, state, seed = 0) {
  const avail = availableTypes(card);
  const reps = state?.seen ? state.reps || 0 : -1; // -1 = thẻ mới/chưa thấy
  const tier = reps < 1 ? ["recall", "listen"] : reps < 3 ? ["cloze", "recall", "speak"] : ["produce", "reverse", "speak"];
  const pool = tier.filter((t) => avail.includes(t));
  const use = pool.length ? pool : avail;
  const i = ((Math.floor(seed) % use.length) + use.length) % use.length;
  return use[i];
}
