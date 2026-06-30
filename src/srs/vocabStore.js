// Quản lý từ vựng người dùng (localStorage) + gộp với built-in. Thuần (trừ localStorage I/O).
// Source of truth: spec §Bước 7. Schema thẻ {c,v,m,e,d,col}; id = c + "::" + v suy ra tự động (C2).
export const USER_KEY = "phrasal-vocab-user-v1";
const FIELDS = ["c", "v", "m", "e", "d", "col"];

export function withId(raw) {
  return { ...raw, id: raw.c + "::" + raw.v };
}

// Gộp built-in + user: bản user ĐÈ built-in khi trùng id. Trả mảng đã có id.
export function mergeVocab(builtin, userRaw) {
  const map = new Map();
  for (const c of builtin) map.set(c.id, c);
  for (const r of userRaw) {
    const c = withId(r);
    map.set(c.id, c);
  }
  return [...map.values()];
}

// localStorage I/O cho từ user (mảng raw {c,v,m,e,d,col}).
export function loadUserVocab() {
  try {
    const v = JSON.parse(localStorage.getItem(USER_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveUserVocab(list) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(list));
  } catch {
    /* localStorage đầy/không khả dụng — bỏ qua */
  }
}

// Chuẩn hoá 1 bản ghi: chỉ giữ 6 trường, trim. Trả null nếu thiếu c hoặc v (spec §Bước 7).
export function normalizeEntry(x) {
  if (!x || typeof x !== "object") return null;
  const out = {};
  for (const k of FIELDS) out[k] = typeof x[k] === "string" ? x[k].trim() : "";
  return out.c && out.v ? out : null;
}

// Parse chuỗi JSON (kỳ vọng MẢNG) → {ok, valid[], invalid} hoặc {ok:false, error}. KHÔNG ghi gì.
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON không hợp lệ" };
  }
  if (!Array.isArray(data)) return { ok: false, error: "Cần một MẢNG các từ" };
  const valid = [];
  let invalid = 0;
  for (const x of data) {
    const n = normalizeEntry(x);
    if (n) valid.push(n);
    else invalid++;
  }
  return { ok: true, valid, invalid };
}

// Phân loại: bao nhiêu từ là MỚI vs TRÙNG id (đã có trong existingIds — gồm built-in + user).
export function classifyImport(valid, existingIds) {
  let added = 0;
  let duplicate = 0;
  for (const r of valid) (existingIds.has(withId(r).id) ? (duplicate += 1) : (added += 1));
  return { added, duplicate };
}

// Upsert các bản ghi mới vào danh sách user (theo id, bản mới đè). Trả mảng MỚI.
export function upsertUser(existing, incoming) {
  const byId = new Map(existing.map((r) => [withId(r).id, r]));
  for (const r of incoming) byId.set(withId(r).id, r);
  return [...byId.values()];
}

export function exportUser(list) {
  return JSON.stringify(list, null, 2);
}
