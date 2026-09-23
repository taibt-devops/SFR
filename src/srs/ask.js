// Hỏi đáp Việt→Anh (spec Phần 11): kho 20 câu hỏi gần nhất, KÈM LUÔN câu trả lời.
// Lưu kèm câu trả lời để mở lại câu cũ KHÔNG tốn một lượt gọi Claude nào.
//
// THUẦN trừ load/save; nhận `now` từ ngoài để test tất định. KHÔNG mutate tham số.

export const ASK_KEY = "srf-ask-v1";
export const MAX_ASKS = 20;

// Khoá so trùng: bỏ hoa thường + khoảng trắng thừa + chuẩn hoá Unicode.
// NFC bắt buộc vì tiếng Việt có dấu tổ hợp: "cà" gõ hai kiểu ra hai chuỗi byte khác nhau.
export function normVi(vi) {
  return String(vi || "").trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");
}

export function loadAsk() {
  try {
    const v = JSON.parse(localStorage.getItem(ASK_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveAsk(list) {
  try {
    localStorage.setItem(ASK_KEY, JSON.stringify(list));
  } catch {
    /* localStorage không khả dụng — bỏ qua, phiên vẫn chạy được */
  }
}

// Thêm một lần hỏi. Trả mảng MỚI, mới nhất đứng đầu, tối đa MAX_ASKS.
// Hỏi lại câu cũ → đẩy lên đầu + cập nhật câu trả lời, không nhân đôi.
export function addAsk(store = [], vi, answer, now = Date.now()) {
  // Gộp khoảng trắng thừa nhưng GIỮ hoa thường như người học gõ: chuỗi này đem đi hiện trên chip.
  // Hỏi lại cùng một câu viết khác kiểu → bản ghi mang cách viết MỚI NHẤT.
  const q = String(vi || "").trim().replace(/\s+/g, " ");
  const list = Array.isArray(store) ? store : [];
  if (!q) return list;
  const key = normVi(q);
  const rest = list.filter((x) => normVi(x?.vi) !== key);
  return [{ vi: q, a: answer, at: now }, ...rest].slice(0, MAX_ASKS);
}

export function recentAsks(store = [], n = MAX_ASKS) {
  return (Array.isArray(store) ? store : []).slice(0, n);
}
