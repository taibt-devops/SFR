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

// Mọi câu tiếng Anh THUỘC VỀ một bài: drill của nhịp nói + drill khó của phần mở rộng.
export function sentencesOf(lesson) {
  return [...(lesson?.drills || []), ...(lesson?.drills2 || [])]
    .map((d) => d?.en)
    .filter(Boolean);
}

function normCau(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Ghi câu người học nói đúng — giữ câu khớp CAO NHẤT trong ngày làm bằng chứng tiến bộ (§4.1).
// Trả progress MỚI; điểm thấp hơn thì bỏ qua để không ghi đè câu tốt bằng câu tệ.
//
// BẮT BUỘC nhận cả `lesson` chứ không chỉ `day`, để chặn ngay tại đây việc ghi một câu KHÔNG
// thuộc bài đó. Từ Phần 10, nhịp nói có 2 câu đầu là "sửa lỗi hôm qua" do gia sư sinh ra — chúng
// thuộc MẪU CÂU CỦA NGÀY KHÁC. Trước khi có chốt này, nói tốt một câu như vậy sẽ khiến màn chờ
// hiện mẫu câu hôm nay ghép với câu của hôm qua (bug thật, thấy trên máy người dùng):
//   pat "Could you + V ...?"  +  said "I'd like to book a table."
// Đặt chốt ở tầng dữ liệu thay vì một câu `if` trong StepSpeak: caller nào cũng bị chặn, kể cả
// caller viết sau này.
export function recordSaid(progress, lesson, text, score = 1) {
  const t = String(text || "").trim();
  const day = lesson?.day;
  if (!t || !day) return progress;
  const own = sentencesOf(lesson).map(normCau);
  if (!own.includes(normCau(t))) return progress; // câu của bài khác → bỏ, thà trống còn hơn sai
  const prev = progress?.[day] || { steps: {} };
  if (prev.saidBest && (prev.saidScore ?? 0) >= score) return progress;
  return { ...progress, [day]: { ...prev, saidBest: t, saidScore: score } };
}

export function saidFor(progress, day) {
  return progress?.[day]?.saidBest || null;
}

// Câu nói được của một ngày, ĐÃ KIỂM thuộc đúng bài đó.
//
// `recordSaid` đã chặn đường GHI, nhưng chặn ghi không dọn được thứ đã ghi: máy nào chạy bản cũ
// thì trong localStorage vẫn còn câu sai, và màn chờ vẫn hiện mẫu câu hôm nay ghép với câu hôm
// qua. Không thể đi migrate máy của từng người, nên kiểm luôn lúc ĐỌC — dữ liệu cũ tự lành ngay
// lần mở app kế tiếp, và không cần nhớ chạy một bước dọn dẹp nào.
export function saidOf(progress, lesson) {
  const t = progress?.[lesson?.day]?.saidBest;
  if (!t) return null;
  return sentencesOf(lesson).map(normCau).includes(normCau(t)) ? t : null;
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
      said: saidOf(progress, l),
      // Câu ví dụ hiện cùng mẫu: ưu tiên câu CHÍNH BẠN nói được; chưa có thì lấy drill đầu của bài.
      // Cả hai đều đi qua `saidOf` nên luôn thuộc đúng bài này.
      example: saidOf(progress, l) || l.drills?.[0]?.en || null,
      doneAt: progress[l.day].doneAt || null,
      ext: !!progress[l.day].ext,
    }))
    .sort((a, b) => b.day - a.day);
}

// Số ngày đã hoàn thành lõi — dùng cho "12 / 72 mẫu câu".
export function completedCount(progress = {}) {
  return Object.values(progress).filter((e) => e?.core).length;
}

// Danh sách TỪ VỰNG của khoá — dùng cho màn "Từ vựng của tôi".
//
// Hai nguồn, cố ý gộp chung một danh sách vì người học không nghĩ vốn từ của mình chia làm
// "từ hệ thống" với "từ của tôi"; họ chỉ muốn biết mình đang có bao nhiêu chữ trong tay.
//
//  • Từ CỦA BÀI — hiện ngay khi học xong phần LÕI của ngày đó. Cờ `inSrs` cho biết nó đã vào
//    hàng đợi ôn chưa (chỉ vào sau khi làm phần mở rộng, đúng luật §2.3).
//    Bản đầu tôi CHỈ liệt kê từ đã vào hàng đợi, nên ai chỉ học phần lõi sẽ thấy danh sách rỗng
//    và không hiểu vì sao — trong khi bài học rõ ràng có dạy từ. Thà hiện đủ rồi ghi rõ trạng
//    thái, còn hơn giấu đi.
//  • Từ TỰ THÊM ở màn nói và câu lưu từ ô hỏi đáp — vào ngay và luôn nằm trong hàng đợi ôn.
export function learnedWords(lessons = [], progress = {}, myWords = {}) {
  const out = [];
  for (const l of lessons) {
    const p = progress?.[l.day];
    if (!p?.core || l.review || !Array.isArray(l.words)) continue;
    for (const w of l.words) {
      out.push({
        id: `word::${l.day}::${w.w}`,
        w: w.w, ipa: w.ipa || "", m: w.m || "", en: w.en || "",
        day: l.day, week: l.week, mine: false, inSrs: !!p.ext,
      });
    }
  }
  for (const [day, list] of Object.entries(myWords || {})) {
    for (const x of Array.isArray(list) ? list : []) {
      // Cắt khoảng trắng rồi mới kiểm, chứ không chỉ kiểm truthy: chuỗi toàn dấu cách VẪN truthy
      // và đã lọt qua một lần — nó hiện ra thành một dòng trống giữa danh sách.
      const w = String(x?.w || "").trim();
      if (!w) continue;
      out.push({
        id: `word::${day}::${w}`,
        w, ipa: "", m: x.m || "", en: x.en || "",
        day: Number(day), week: null, mine: true, inSrs: true, at: x.at || 0,
      });
    }
  }
  // Ngày mới lên đầu; trong cùng một ngày, từ tự thêm đứng trước vì đó là thứ bạn chủ động nhặt.
  return out.sort((a, b) => b.day - a.day || Number(b.mine) - Number(a.mine));
}

// Đếm những từ THẬT SỰ đang được ôn — con số này đi lên màn chờ nên phải trung thực, không
// gộp cả những từ mới chỉ được liệt kê ra mà chưa luyện lần nào.
export function countLearnedWords(lessons, progress, myWords) {
  return learnedWords(lessons, progress, myWords).filter((x) => x.inSrs).length;
}

// ── Tuần này (dải 7 ô T2…CN) ───────────────────────────────
// ĐẾM SỐ NGÀY HỌC TRONG TUẦN, không phải chuỗi liên tiếp. Nghỉ thứ Tư rồi học lại thứ Năm thì
// vẫn là 3/7 — không có gì bị xoá. Đây là điểm khác cốt lõi với streak: nó không bao giờ trừng
// phạt một ngày nghỉ, nên không cần bất kỳ câu chữ nào về "mất chuỗi".
export const WEEK_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function weekDays(progress = {}, now = Date.now()) {
  const days = doneDays(progress);
  const today = dayStart(now);
  const thu = (new Date(today).getDay() + 6) % 7; // 0 = thứ Hai
  return WEEK_LABELS.map((label, i) => {
    const d = dayStart(today - (thu - i) * DAY);
    return { label, at: d, done: days.has(d), today: d === today, future: d > today };
  });
}

export function weekCount(progress = {}, now = Date.now()) {
  return weekDays(progress, now).filter((d) => d.done).length;
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
