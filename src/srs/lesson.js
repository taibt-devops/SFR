// Máy trạng thái một buổi học (spec §3.3). THUẦN: không React, không localStorage, không Date.now().
// Mọi hàm nhận `progress` và trả object MỚI — không mutate (cùng kỷ luật với sm2.review()).
//
// `progress` = { [day]: { steps: {...}, core: bool, ext: bool, doneAt: ts, saidBest: string } }
// Persistence + streak + saidBest do `course.js` lo; file này chỉ biết "đang ở nhịp nào".

// Số thứ tự nhịp trong spec là ĐỊNH DANH, không phải thứ tự chạy: lõi chạy 0-1-2-4 (nhịp 3 nằm ở
// phần mở rộng). Tên bước ở đây mới là thứ tự chạy thật.
export const CORE_STEPS = ["review", "listen", "pattern", "speak"]; // nhịp 0,1,2,4
export const EXT_STEPS = ["words", "speak2", "roleplay"]; // nhịp 3,4b,5
export const WEEK_STEPS = ["report", "review", "assess", "chat"]; // ngày chốt tuần (§3.4, §10.6b)

export function isWeekClose(lesson) {
  return !!lesson?.review;
}

// Các bước LÕI của một bài — ngày chốt tuần có bộ bước riêng.
export function coreStepsFor(lesson) {
  return isWeekClose(lesson) ? WEEK_STEPS : CORE_STEPS;
}

// Ngày chốt tuần không có phần mở rộng (không có từ mới / drills2 / scene).
export function extStepsFor(lesson) {
  return isWeekClose(lesson) ? [] : EXT_STEPS;
}

function entry(progress, day) {
  return progress?.[day] || { steps: {} };
}

export function stepDone(progress, day, step) {
  return !!entry(progress, day).steps?.[step];
}

export function isCoreDone(progress, day) {
  return !!entry(progress, day).core;
}

export function isExtDone(progress, day) {
  return !!entry(progress, day).ext;
}

// Bước kế tiếp phải làm, hoặc null nếu xong phần đang chạy.
// `ext = false` → đi trong phần lõi; `ext = true` → đi trong phần mở rộng.
export function nextStep(lesson, progress, { ext = false } = {}) {
  const steps = ext ? extStepsFor(lesson) : coreStepsFor(lesson);
  return steps.find((s) => !stepDone(progress, lesson.day, s)) || null;
}

// Ghi nhận xong một nhịp. Trả progress MỚI.
// Khi nhịp cuối của lõi xong → đánh dấu `core` + `doneAt` (mốc để tính streak ở course.js).
export function completeStep(progress, lesson, step, now) {
  const day = lesson.day;
  const prev = entry(progress, day);
  const steps = { ...prev.steps, [step]: true };
  const core = coreStepsFor(lesson).every((s) => steps[s]);
  const extSteps = extStepsFor(lesson);
  const ext = extSteps.length > 0 && extSteps.every((s) => steps[s]);
  return {
    ...progress,
    [day]: {
      ...prev,
      steps,
      core,
      ext,
      // doneAt ghi MỘT LẦN khi lõi hoàn thành — làm lại không dời mốc streak.
      doneAt: prev.doneAt ?? (core ? now : undefined),
    },
  };
}

// Bài của hôm nay = bài chưa xong lõi, `day` nhỏ nhất (C11 — bài gắn TIẾN ĐỘ, không gắn lịch).
// Nghỉ 5 ngày quay lại vẫn vào đúng bài kế tiếp, không nhảy cóc, không "mất bài".
// Hết bài đã soạn → null (màn chờ hiện thông báo đã học hết phần có sẵn).
export function todayLesson(lessons = [], progress = {}) {
  return [...lessons].sort((a, b) => a.day - b.day).find((l) => !isCoreDone(progress, l.day)) || null;
}

// Đã xong lõi hôm nay chưa (để màn chờ biết hiện "Bắt đầu" hay "Học thêm 10 phút").
export function lastCompleted(lessons = [], progress = {}) {
  const done = lessons.filter((l) => isCoreDone(progress, l.day));
  return done.length ? done.reduce((a, b) => (a.day > b.day ? a : b)) : null;
}

// Tiến độ tổng của phiên đang chạy: { index, total } — cho thanh chấm trên đầu màn.
export function stepProgress(lesson, progress, { ext = false } = {}) {
  const steps = ext ? extStepsFor(lesson) : coreStepsFor(lesson);
  const done = steps.filter((s) => stepDone(progress, lesson.day, s)).length;
  return { index: Math.min(done, steps.length), total: steps.length, steps };
}
