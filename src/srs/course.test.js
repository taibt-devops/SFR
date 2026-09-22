import { beforeEach, describe, expect, it } from "vitest";
import {
  loadCourse, saveCourse, purgeLegacy, streakFor, doneToday,
  recordSaid, saidFor, learnedPatterns, completedCount, recentDays,
  COURSE_KEY, RESET_FLAG, LEGACY_KEYS,
} from "./course.js";

// Mock localStorage tối giản (chạy trong node, không cần jsdom) — cùng kiểu với storage.test.js.
function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
    _dump: () => store,
  };
}

const DAY = 86400000;
// Trưa ngày 2026-09-22 giờ địa phương — dùng giữa ngày để không dính biên 00:00.
const NOW = new Date(2026, 8, 22, 12, 0, 0).getTime();
const at = (daysAgo) => NOW - daysAgo * DAY;
const done = (doneAt) => ({ steps: {}, core: true, doneAt });

beforeEach(() => {
  globalThis.localStorage = mockLocalStorage();
});

describe("load / save", () => {
  it("chưa có gì → object rỗng", () => {
    expect(loadCourse()).toEqual({});
  });

  it("lưu rồi đọc lại đúng", () => {
    saveCourse({ 1: done(NOW) });
    expect(loadCourse()[1].core).toBe(true);
    expect(localStorage.getItem(COURSE_KEY)).toBeTruthy();
  });

  it("JSON hỏng → object rỗng, không ném lỗi", () => {
    localStorage.setItem(COURSE_KEY, "{{{");
    expect(loadCourse()).toEqual({});
  });
});

describe("purgeLegacy — dọn bản cũ đúng một lần", () => {
  it("xoá hết key cũ và đặt cờ", () => {
    for (const k of LEGACY_KEYS) localStorage.setItem(k, "x");
    expect(purgeLegacy()).toBe(true);
    for (const k of LEGACY_KEYS) expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem(RESET_FLAG)).toBeTruthy();
  });

  it("chạy lần hai không xoá nữa (dữ liệu mới an toàn)", () => {
    purgeLegacy();
    localStorage.setItem("phrasal-srs-v1", "du-lieu-moi-ghi-lai");
    expect(purgeLegacy()).toBe(false);
    expect(localStorage.getItem("phrasal-srs-v1")).toBe("du-lieu-moi-ghi-lai");
  });

  it("KHÔNG đụng key của khoá học mới", () => {
    saveCourse({ 1: done(NOW) });
    purgeLegacy();
    expect(loadCourse()[1].core).toBe(true);
  });
});

describe("streakFor — C12: chỉ đếm ngày hoàn thành LÕI", () => {
  it("chưa học gì → 0", () => {
    expect(streakFor({}, NOW)).toBe(0);
  });

  it("học hôm nay → 1", () => {
    expect(streakFor({ 1: done(NOW) }, NOW)).toBe(1);
  });

  it("3 ngày liên tiếp kể cả hôm nay → 3", () => {
    const p = { 1: done(at(2)), 2: done(at(1)), 3: done(NOW) };
    expect(streakFor(p, NOW)).toBe(3);
  });

  it("chưa học hôm nay nhưng hôm qua có → chuỗi vẫn tính tới hôm qua", () => {
    const p = { 1: done(at(2)), 2: done(at(1)) };
    expect(streakFor(p, NOW)).toBe(2);
  });

  it("bỏ trọn một ngày → chuỗi đứt, chỉ đếm đoạn gần nhất", () => {
    const p = { 1: done(at(5)), 2: done(at(4)), 3: done(at(1)), 4: done(NOW) };
    expect(streakFor(p, NOW)).toBe(2);
  });

  it("bài chưa xong lõi KHÔNG tính vào chuỗi", () => {
    const p = { 1: { steps: {}, core: false, doneAt: NOW } };
    expect(streakFor(p, NOW)).toBe(0);
    expect(doneToday(p, NOW)).toBe(false);
  });

  it("làm phần mở rộng không cộng thêm streak", () => {
    const p = { 1: { ...done(NOW), ext: true } };
    expect(streakFor(p, NOW)).toBe(1);
  });

  it("hai bài xong cùng một ngày chỉ tính một ngày", () => {
    const p = { 1: done(NOW), 2: done(NOW + 1000) };
    expect(streakFor(p, NOW)).toBe(1);
  });
});

describe("recordSaid — giữ câu khớp cao nhất", () => {
  it("ghi câu đầu tiên", () => {
    const p = recordSaid({}, 1, "I'd like a tea.", 0.8);
    expect(saidFor(p, 1)).toBe("I'd like a tea.");
  });

  it("điểm cao hơn thì thay, thấp hơn thì giữ nguyên", () => {
    let p = recordSaid({}, 1, "cau tam duoc", 0.6);
    p = recordSaid(p, 1, "cau tot hon", 0.9);
    expect(saidFor(p, 1)).toBe("cau tot hon");
    p = recordSaid(p, 1, "cau te", 0.2);
    expect(saidFor(p, 1)).toBe("cau tot hon");
  });

  it("chuỗi rỗng bị bỏ qua, KHÔNG mutate progress", () => {
    const p0 = { 1: done(NOW) };
    expect(recordSaid(p0, 1, "   ")).toBe(p0);
    const p1 = recordSaid(p0, 1, "x", 1);
    expect(p0[1].saidBest).toBeUndefined();
    expect(p1).not.toBe(p0);
  });

  it("giữ nguyên các trường sẵn có của ngày đó", () => {
    const p = recordSaid({ 1: done(NOW) }, 1, "x", 1);
    expect(p[1].core).toBe(true);
    expect(p[1].doneAt).toBe(NOW);
  });
});

describe("learnedPatterns — bằng chứng tiến bộ", () => {
  const lessons = [
    { day: 1, week: 1, pat: "P1", patVi: "V1" },
    { day: 2, week: 1, pat: "P2", patVi: "V2" },
    { day: 6, week: 1, review: true },
  ];

  it("chỉ bài đã xong lõi, mới nhất lên đầu", () => {
    const p = { 1: done(at(1)), 2: done(NOW) };
    expect(learnedPatterns(lessons, p).map((x) => x.day)).toEqual([2, 1]);
  });

  it("kèm câu người học đã nói", () => {
    let p = { 1: done(NOW) };
    p = recordSaid(p, 1, "I'd like a tea.", 1);
    expect(learnedPatterns(lessons, p)[0].said).toBe("I'd like a tea.");
  });

  it("ngày chốt tuần không có mẫu câu nên không vào danh sách", () => {
    const p = { 6: done(NOW) };
    expect(learnedPatterns(lessons, p)).toEqual([]);
  });

  it("completedCount đếm cả ngày chốt tuần", () => {
    expect(completedCount({ 1: done(NOW), 6: done(NOW), 2: { core: false } })).toBe(2);
  });
});

describe("recentDays — dải 14 ngày trên màn chờ", () => {
  it("đúng độ dài, cũ → mới, ô cuối là hôm nay", () => {
    const r = recentDays({}, 14, NOW);
    expect(r).toHaveLength(14);
    expect(r.at(-1).today).toBe(true);
    expect(r.every((d) => d.done === false)).toBe(true);
    expect(r[0].day).toBeLessThan(r.at(-1).day);
  });

  it("đánh dấu đúng ngày đã học, chừa trống ngày bỏ", () => {
    const p = { 1: done(at(3)), 2: done(at(1)), 3: done(NOW) };
    const r = recentDays(p, 5, NOW);
    expect(r.map((d) => d.done)).toEqual([false, true, false, true, true]);
  });

  it("ô có phần mở rộng được đánh dấu riêng", () => {
    const p = { 1: { ...done(NOW), ext: true } };
    expect(recentDays(p, 3, NOW).at(-1)).toMatchObject({ done: true, ext: true });
  });

  it("hai bài cùng ngày, một bài có ext → ô đó vẫn tính là có ext", () => {
    const p = { 1: done(NOW), 2: { ...done(NOW + 1000), ext: true } };
    expect(recentDays(p, 2, NOW).at(-1).ext).toBe(true);
  });

  it("bài chưa xong lõi không hiện trên dải", () => {
    expect(recentDays({ 1: { core: false, doneAt: NOW } }, 3, NOW).some((d) => d.done)).toBe(false);
  });
});
