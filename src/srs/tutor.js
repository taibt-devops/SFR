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

const daysDesc = (store) => Object.keys(store || {}).map(Number).filter(Boolean).sort((a, b) => b - a);

// Lỗi lặp nhiều nhất. Gộp HAI nguồn vì cả hai dùng chung ERROR_TAGS:
//   - phân tích cuối buổi (hằng ngày)
//   - chấm CEFR `speaking.js` (2–3 lần/tuần), mỗi entry có `tags`
export function topErrors(store = {}, speakingList = [], n = 5) {
  const counts = {};
  const bump = (tag) => {
    if (ERROR_TAGS.includes(tag)) counts[tag] = (counts[tag] || 0) + 1;
  };
  for (const day of Object.values(store || {})) for (const e of day?.analysis?.errors || []) bump(e.tag);
  for (const a of speakingList || []) for (const t of a?.tags || []) bump(t);
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, n);
}

// Điều cần chú ý, lấy của ngày GẦN NHẤT có phân tích.
export function focusFor(store = {}) {
  for (const d of daysDesc(store)) {
    const f = store[d]?.analysis?.focus;
    if (f) return f;
  }
  return "";
}

// Câu sửa lỗi cho buổi `day`: lấy từ ngày GẦN NHẤT TRƯỚC ĐÓ, không lấy của chính ngày này
// (phân tích của ngày N chạy lúc đóng ngày N, nên chỉ dùng được từ ngày N+1).
export function drillsFor(store = {}, day) {
  for (const d of daysDesc(store)) {
    if (d >= day) continue;
    const ds = store[d]?.analysis?.drills || [];
    if (ds.length) return ds;
  }
  return [];
}

export function hintFor(store = {}, itemId) {
  for (const d of daysDesc(store)) {
    const h = (store[d]?.analysis?.hints || []).find((x) => x.itemId === itemId);
    if (h) return h;
  }
  return null;
}

// Gợi ý chỉ nhắc MỘT lần: dùng xong thì gỡ, tránh nhắc mãi một lỗi đã sửa.
// KHÔNG đặt tên `useHint`: tiền tố `use` khiến quy tắc lint của React coi đây là hook, mà hàm này
// được gọi bên trong updater của setState — vi phạm rules-of-hooks.
export function clearHint(store = {}, itemId) {
  for (const d of daysDesc(store)) {
    const entry = store[d];
    const hints = entry?.analysis?.hints || [];
    if (!hints.some((x) => x.itemId === itemId)) continue;
    return {
      ...store,
      [d]: { ...entry, analysis: { ...entry.analysis, hints: hints.filter((x) => x.itemId !== itemId) } },
    };
  }
  return store;
}

// Đếm nhãn lỗi trong một tuần (6 ngày/tuần, khớp §5).
function countsInWeek(store, week) {
  const from = (week - 1) * 6 + 1;
  const to = week * 6;
  const counts = {};
  for (let d = from; d <= to; d++) {
    for (const e of store?.[d]?.analysis?.errors || []) {
      if (ERROR_TAGS.includes(e.tag)) counts[e.tag] = (counts[e.tag] || 0) + 1;
    }
  }
  return counts;
}

// So tuần này với tuần trước. So TƯƠNG ĐỐI chứ không phải điểm tuyệt đối: "mạo từ từ 6 xuống 1"
// có ý nghĩa với người học, "bạn đạt B1" thì không.
export function weeklyReport(store = {}, week) {
  const before = countsInWeek(store, week - 1);
  const after = countsInWeek(store, week);
  const fixed = [];
  const improved = [];
  const worse = [];
  const appeared = [];
  for (const tag of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[tag] || 0;
    const a = after[tag] || 0;
    if (b && !a) fixed.push(tag);
    else if (!b && a) appeared.push(tag);
    else if (a < b) improved.push({ tag, before: b, after: a });
    else if (a > b) worse.push({ tag, before: b, after: a });
  }
  return { fixed: fixed.sort(), improved, appeared: appeared.sort(), worse };
}
