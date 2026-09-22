import { describe, it, expect } from "vitest";
import {
  CORE_STEPS, EXT_STEPS, WEEK_STEPS,
  nextStep, completeStep, isCoreDone, isExtDone, todayLesson, lastCompleted,
  coreStepsFor, extStepsFor, stepProgress, isWeekClose,
} from "./lesson.js";

const L = (day, extra = {}) => ({ day, week: Math.ceil(day / 6), pat: "P", drills: [], words: [], ...extra });
const teach = L(1);
const weekClose = L(6, { review: true, pat: undefined });
const NOW = 1_700_000_000_000;

// Chạy hết một danh sách bước → progress sau cùng.
function runAll(lesson, steps, progress = {}, now = NOW) {
  return steps.reduce((p, s) => completeStep(p, lesson, s, now), progress);
}

describe("bộ bước theo loại ngày", () => {
  it("bài dạy: 4 nhịp lõi + 3 nhịp mở rộng", () => {
    expect(coreStepsFor(teach)).toEqual(CORE_STEPS);
    expect(extStepsFor(teach)).toEqual(EXT_STEPS);
    expect(isWeekClose(teach)).toBe(false);
  });

  it("ngày chốt tuần: bộ bước riêng, KHÔNG có phần mở rộng", () => {
    expect(coreStepsFor(weekClose)).toEqual(WEEK_STEPS);
    expect(extStepsFor(weekClose)).toEqual([]);
    expect(isWeekClose(weekClose)).toBe(true);
  });
});

describe("nextStep", () => {
  it("bắt đầu từ nhịp đầu tiên", () => {
    expect(nextStep(teach, {})).toBe("review");
  });

  it("đi lần lượt đúng thứ tự lõi", () => {
    let p = {};
    const seen = [];
    for (let i = 0; i < CORE_STEPS.length; i++) {
      const s = nextStep(teach, p);
      seen.push(s);
      p = completeStep(p, teach, s, NOW);
    }
    expect(seen).toEqual(CORE_STEPS);
    expect(nextStep(teach, p)).toBeNull();
  });

  it("phần mở rộng có hàng đợi riêng, không lẫn với lõi", () => {
    const p = runAll(teach, CORE_STEPS);
    expect(nextStep(teach, p)).toBeNull();
    expect(nextStep(teach, p, { ext: true })).toBe("words");
  });
});

describe("completeStep", () => {
  it("KHÔNG mutate progress đầu vào", () => {
    const p0 = {};
    const p1 = completeStep(p0, teach, "review", NOW);
    expect(p0).toEqual({});
    expect(p1).not.toBe(p0);
  });

  it("core bật đúng lúc nhịp cuối của lõi xong, không sớm hơn", () => {
    let p = {};
    for (const s of CORE_STEPS.slice(0, -1)) {
      p = completeStep(p, teach, s, NOW);
      expect(isCoreDone(p, 1)).toBe(false);
    }
    p = completeStep(p, teach, CORE_STEPS.at(-1), NOW);
    expect(isCoreDone(p, 1)).toBe(true);
    expect(p[1].doneAt).toBe(NOW);
  });

  it("ext chỉ bật khi xong cả 3 nhịp mở rộng", () => {
    let p = runAll(teach, CORE_STEPS);
    p = completeStep(p, teach, "words", NOW);
    expect(isExtDone(p, 1)).toBe(false);
    p = runAll(teach, ["speak2", "roleplay"], p);
    expect(isExtDone(p, 1)).toBe(true);
  });

  it("làm lại một nhịp KHÔNG dời mốc doneAt (streak không bị đẩy sang ngày khác)", () => {
    const p = runAll(teach, CORE_STEPS);
    const later = completeStep(p, teach, "speak", NOW + 86400000);
    expect(later[1].doneAt).toBe(NOW);
  });

  it("ngày chốt tuần xong 3 nhịp riêng là core, ext luôn false", () => {
    const p = runAll(weekClose, WEEK_STEPS);
    expect(isCoreDone(p, 6)).toBe(true);
    expect(isExtDone(p, 6)).toBe(false);
  });
});

describe("todayLesson — C11: bài gắn tiến độ, không gắn lịch", () => {
  const lessons = [L(3), L(1), L(2)]; // cố ý không theo thứ tự

  it("chưa học gì → bài 1", () => {
    expect(todayLesson(lessons, {}).day).toBe(1);
  });

  it("xong bài 1 → bài 2", () => {
    const p = runAll(L(1), CORE_STEPS);
    expect(todayLesson(lessons, p).day).toBe(2);
  });

  it("nghỉ bao lâu cũng vào đúng bài kế tiếp, KHÔNG nhảy cóc", () => {
    // Xong bài 1 từ 30 ngày trước; hôm nay vẫn phải là bài 2, không phải bài 31.
    const p = runAll(L(1), CORE_STEPS, {}, NOW - 30 * 86400000);
    expect(todayLesson(lessons, p).day).toBe(2);
  });

  it("làm xong phần mở rộng không làm nhảy bài", () => {
    const p = runAll(L(1), [...CORE_STEPS, ...EXT_STEPS]);
    expect(todayLesson(lessons, p).day).toBe(2);
  });

  it("hết bài đã soạn → null", () => {
    let p = {};
    for (const l of lessons) p = runAll(l, CORE_STEPS, p);
    expect(todayLesson(lessons, p)).toBeNull();
  });
});

describe("lastCompleted / stepProgress", () => {
  it("lastCompleted lấy bài có day lớn nhất đã xong lõi", () => {
    let p = runAll(L(1), CORE_STEPS);
    p = runAll(L(2), CORE_STEPS, p);
    expect(lastCompleted([L(1), L(2), L(3)], p).day).toBe(2);
    expect(lastCompleted([L(1)], {})).toBeNull();
  });

  it("stepProgress đếm đúng cho thanh chấm", () => {
    expect(stepProgress(teach, {})).toMatchObject({ index: 0, total: 4 });
    const p = runAll(teach, ["review", "listen"]);
    expect(stepProgress(teach, p)).toMatchObject({ index: 2, total: 4 });
    expect(stepProgress(weekClose, {})).toMatchObject({ index: 0, total: 3 });
  });
});
