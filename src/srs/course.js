// Tiến độ khoá học + streak + bằng chứng tiến bộ (spec §4). Phần THUẦN nhận `progress`/`now` từ
// ngoài và trả object mới; chỉ load/save/purge là chạm localStorage.
//
// Streak ở đây CHỈ đếm ngày hoàn thành phần LÕI (C12). KHÔNG dùng `srs/stats.js` cũ — module đó đếm
// theo lượt ôn thẻ, đúng đơn vị bản cũ nhưng sai đơn vị bản này (đơn vị 1% = 1 mẫu câu/ngày).
import { dayStart } from "./daily.js";

export const COURSE_KEY = "srf-course-v1";
export const RESET_FLAG = "srf-reset-v1";

// Key của bản cũ — xoá đúng một lần khi chạy bản mới (spec §2.4).
export const LEGACY_KEYS = [
  "phrasal-srs-v1",
  "phrasal-speaking-v1",
  "phrasal-coach-v1",
  "phrasal-daily-v1",
  "phrasal-warmup-v1",
  "phrasal-vocab-user-v1",
  "phrasal-stats-v1",
  "phrasal-patterns-v1",
  "phrasal-voicemode-v1",
];

const DAY = 86400000;

export function loadCourse() {
  try {
    return JSON.parse(localStorage.getItem(COURSE_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveCourse(progress) {
  try {
    localStorage.setItem(COURSE_KEY, JSON.stringify(progress));
  } catch {
    /* localStorage không khả dụng — bỏ qua, phiên vẫn chạy được */
  }
}

// Dọn dữ liệu bản cũ MỘT LẦN. Id item đã đổi hoàn toàn nên state cũ không bao giờ khớp;
// để lại chỉ tốn chỗ và gây nhiễu khi debug. Có cờ nên chạy lại không xoá thêm lần nữa.
export function purgeLegacy() {
  try {
    if (localStorage.getItem(RESET_FLAG)) return false;
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    localStorage.setItem(RESET_FLAG, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

// Các mốc ngày (00:00 địa phương) đã hoàn thành lõi.
function doneDays(progress) {
  const out = new Set();
  for (const e of Object.values(progress || {})) {
    if (e?.core && e.doneAt) out.add(dayStart(e.doneAt));
  }
  return out;
}

export function doneToday(progress, now) {
  return doneDays(progress).has(dayStart(now));
}

// Chuỗi ngày liên tiếp hoàn thành lõi. Chưa học hôm nay thì chuỗi vẫn tính tới hôm qua —
// streak chỉ đứt khi bỏ trọn một ngày, không đứt lúc 00:01 sáng (C12: không tạo áp lực).
export function streakFor(progress, now) {
  const days = doneDays(progress);
  const today = dayStart(now);
  let cursor = days.has(today) ? today : today - DAY;
  if (!days.has(cursor)) return 0;
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor -= DAY;
  }
  return n;
}

// Ghi câu người học nói đúng — giữ câu khớp CAO NHẤT trong ngày làm bằng chứng tiến bộ (§4.1).
// Trả progress MỚI; điểm thấp hơn thì bỏ qua để không ghi đè câu tốt bằng câu tệ.
export function recordSaid(progress, day, text, score = 1) {
  const t = String(text || "").trim();
  if (!t) return progress;
  const prev = progress?.[day] || { steps: {} };
  if (prev.saidBest && (prev.saidScore ?? 0) >= score) return progress;
  return { ...progress, [day]: { ...prev, saidBest: t, saidScore: score } };
}

export function saidFor(progress, day) {
  return progress?.[day]?.saidBest || null;
}

// Danh sách mẫu câu đã nắm cho màn "Tôi nói được gì rồi" — MỚI NHẤT LÊN ĐẦU (§4.3).
export function learnedPatterns(lessons = [], progress = {}) {
  return lessons
    .filter((l) => l.pat && progress?.[l.day]?.core)
    .map((l) => ({
      day: l.day,
      week: l.week,
      pat: l.pat,
      patVi: l.patVi,
      said: saidFor(progress, l.day),
      doneAt: progress[l.day].doneAt || null,
      ext: !!progress[l.day].ext,
    }))
    .sort((a, b) => b.day - a.day);
}

// Số ngày đã hoàn thành lõi — dùng cho "12 / 72 mẫu câu".
export function completedCount(progress = {}) {
  return Object.values(progress).filter((e) => e?.core).length;
}

// n ngày gần nhất (CŨ → MỚI) cho dải streak trên màn chờ: [{ day, done, ext, today }].
// Nhìn thấy khoảng trống của mình là động lực mạnh hơn một con số streak trần trụi.
export function recentDays(progress = {}, n = 14, now = Date.now()) {
  const days = new Map(); // dayStart -> { core, ext }
  for (const e of Object.values(progress)) {
    if (!e?.core || !e.doneAt) continue;
    const k = dayStart(e.doneAt);
    const prev = days.get(k);
    days.set(k, { core: true, ext: !!e.ext || !!prev?.ext });
  }
  const today = dayStart(now);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = today - i * DAY;
    const hit = days.get(d);
    out.push({ day: d, done: !!hit, ext: !!hit?.ext, today: d === today });
  }
  return out;
}
