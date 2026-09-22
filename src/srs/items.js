// Cầu nối bài học → review item cho SM-2 (spec §2.3). THUẦN, không React, không localStorage.
//
// SM-2 (`sm2.js`) không biết gì về bài học — nó chỉ cần `{ id }` + `getState(id)`. File này sinh ra
// các item đó từ nội dung khoá học. KHÔNG đụng vào sm2.js (C1).
//
// Quy tắc quan trọng (spec §2.3): item TỪ VỰNG chỉ ra đời khi người học thật sự làm nhịp 3 (mở rộng).
// Đây là cơ chế tự điều tiết nợ ôn tập — ngày bận không nạp từ mới thì hàng đợi hôm sau không phình.

export const PAT = "pat";
export const WORD = "word";

export function patId(day) {
  return `${PAT}::${day}`;
}
export function wordId(day, w) {
  return `${WORD}::${day}::${w}`;
}

// Tách id ngược lại → { kind, day, w } (dùng khi đọc state cũ mà không có bài trong tay).
export function parseId(id) {
  const [kind, day, w] = String(id).split("::");
  if (kind !== PAT && kind !== WORD) return null;
  return { kind, day: Number(day), w: w || null };
}

// Item mẫu câu của một bài. Ngày chốt tuần (review) không có mẫu → null.
export function patItem(lesson) {
  if (!lesson || lesson.review || !lesson.pat) return null;
  return {
    id: patId(lesson.day),
    kind: PAT,
    day: lesson.day,
    label: lesson.pat,
    sub: lesson.patVi,
    variants: lesson.drills.map((d) => ({ vi: d.vi, en: d.en })),
  };
}

// Item từ vựng của một bài (mỗi từ một item).
export function wordItems(lesson) {
  if (!lesson || lesson.review || !Array.isArray(lesson.words)) return [];
  return lesson.words.map((w) => ({
    id: wordId(lesson.day, w.w),
    kind: WORD,
    day: lesson.day,
    label: w.w,
    sub: w.m,
    variants: [{ vi: w.vi, en: w.en }],
  }));
}

// Item của MỘT bài. `includeWords` = người học đã làm nhịp 3 của bài đó chưa.
export function itemsOf(lesson, { includeWords = false } = {}) {
  const pat = patItem(lesson);
  return [...(pat ? [pat] : []), ...(includeWords ? wordItems(lesson) : [])];
}

// Toàn bộ item đủ điều kiện vào hàng đợi ôn, dựa trên tiến độ khoá học.
// progress: { [day]: { core: bool, ext: bool } } — xem `course.js`.
// Bài chưa học xong lõi thì CHƯA sinh item nào: không ôn thứ chưa từng được dạy.
export function itemsFor(lessons = [], progress = {}) {
  const out = [];
  for (const l of lessons) {
    const p = progress[l.day];
    if (!p || !p.core) continue;
    out.push(...itemsOf(l, { includeWords: !!p.ext }));
  }
  return out;
}

// Chọn biến thể để hỏi lần này — xoay vòng theo `reps` nên TẤT ĐỊNH (test được) mà vẫn không lặp
// đúng một câu mãi. Item từ vựng chỉ có 1 biến thể nên luôn trả về nó.
export function promptFor(item, state) {
  const vs = item?.variants || [];
  if (vs.length === 0) return null;
  const reps = Math.max(0, Number(state?.reps) || 0);
  return vs[reps % vs.length];
}
