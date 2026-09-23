// Kho câu ví dụ thêm cho từ vựng (spec Phần 12). THUẦN trừ load/save; nhận `now` từ ngoài.
//
// Vì sao phải lưu: sinh ví dụ tốn một lượt gọi Claude và vài giây. Xem lại cùng một từ vào ngày
// mai mà phải chờ lần nữa thì chẳng ai bấm lần thứ hai. Lưu xong thì màn từ vựng còn đọc được
// khi mất mạng.

export const EX_KEY = "srf-ex-v1";
export const TOI_DA_TU = 60;   // trần số TỪ được lưu ví dụ, tránh phình localStorage
export const TOI_DA_CAU = 4;   // mỗi từ giữ nhiều nhất ngần này câu

// Khoá tra: bỏ hoa thường + khoảng trắng thừa + chuẩn hoá Unicode.
export function khoaTu(w) {
  return String(w || "").trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");
}

export function loadEx() {
  try {
    const v = JSON.parse(localStorage.getItem(EX_KEY));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function saveEx(store) {
  try {
    localStorage.setItem(EX_KEY, JSON.stringify(store));
  } catch {
    /* localStorage đầy/không khả dụng — bỏ qua, màn vẫn chạy, chỉ là không nhớ */
  }
}

// Ép danh sách ví dụ của LLM về đúng khuôn. Lớp phòng thủ duy nhất giữa Claude và giao diện.
// Câu không có phần tiếng Anh thì vô dụng → bỏ.
export function sanitizeEx(raw, gioiHan = TOI_DA_CAU) {
  const s = (v) => (typeof v === "string" ? v.trim() : "");
  return (Array.isArray(raw) ? raw : [])
    .map((x) => (x && typeof x === "object" && !Array.isArray(x) ? { en: s(x.en), vi: s(x.vi) } : null))
    .filter((x) => x && x.en)
    .slice(0, gioiHan);
}

export function exFor(store, w) {
  return store?.[khoaTu(w)]?.items || [];
}

// Thêm ví dụ cho một từ. Trả store MỚI, KHÔNG mutate.
// Trùng câu (so sau khi chuẩn hoá) thì bỏ — hỏi lại hai lần hay ra vài câu giống nhau.
export function addEx(store = {}, w, items, now = Date.now()) {
  const k = khoaTu(w);
  const moi = sanitizeEx(items);
  if (!k || !moi.length) return store && typeof store === "object" ? store : {};
  const cu = exFor(store, w);
  const thay = new Set(cu.map((x) => khoaTu(x.en)));
  const gop = [...cu];
  for (const x of moi) {
    if (thay.has(khoaTu(x.en))) continue;
    thay.add(khoaTu(x.en));
    gop.push(x);
  }
  const out = { ...store, [k]: { items: gop.slice(0, TOI_DA_CAU), at: now } };
  return catBot(out);
}

// Giữ trần: quá TOI_DA_TU thì bỏ những từ lâu nhất không đụng tới.
// Không có trần thì localStorage phình dần rồi một ngày ném QuotaExceeded ngay giữa buổi học.
function catBot(store) {
  const keys = Object.keys(store);
  if (keys.length <= TOI_DA_TU) return store;
  const giu = keys
    .sort((a, b) => (store[b]?.at || 0) - (store[a]?.at || 0))
    .slice(0, TOI_DA_TU);
  const out = {};
  for (const k of giu) out[k] = store[k];
  return out;
}
