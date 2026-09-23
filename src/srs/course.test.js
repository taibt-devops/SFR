import { beforeEach, describe, expect, it } from "vitest";
import {
  loadCourse, saveCourse, purgeLegacy, streakFor, doneToday,
  recordSaid, saidFor, learnedPatterns, completedCount, recentDays,
  weekDays, weekCount, sentencesOf, saidOf, ngayNghi, learnedWords, countLearnedWords, WEEK_LABELS,
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
  // Bài mẫu: mọi câu ghi được PHẢI nằm trong drills/drills2 của chính bài này.
  const BAI = {
    day: 1,
    drills: [{ vi: "Cho tôi một trà.", en: "I'd like a tea." }, { vi: "x", en: "cau tam duoc" }],
    drills2: [{ vi: "y", en: "cau tot hon" }],
  };

  it("ghi câu đầu tiên", () => {
    const p = recordSaid({}, BAI, "I'd like a tea.", 0.8);
    expect(saidFor(p, 1)).toBe("I'd like a tea.");
  });

  it("điểm cao hơn thì thay, thấp hơn thì giữ nguyên", () => {
    let p = recordSaid({}, BAI, "cau tam duoc", 0.6);
    p = recordSaid(p, BAI, "cau tot hon", 0.9);
    expect(saidFor(p, 1)).toBe("cau tot hon");
    p = recordSaid(p, BAI, "cau tam duoc", 0.2);
    expect(saidFor(p, 1)).toBe("cau tot hon");
  });

  it("chuỗi rỗng bị bỏ qua, KHÔNG mutate progress", () => {
    const p0 = { 1: done(NOW) };
    expect(recordSaid(p0, BAI, "   ")).toBe(p0);
    const p1 = recordSaid(p0, BAI, "I'd like a tea.", 1);
    expect(p0[1].saidBest).toBeUndefined();
    expect(p1).not.toBe(p0);
  });

  it("giữ nguyên các trường sẵn có của ngày đó", () => {
    const p = recordSaid({ 1: done(NOW) }, BAI, "I'd like a tea.", 1);
    expect(p[1].core).toBe(true);
    expect(p[1].doneAt).toBe(NOW);
  });

  // ── Bug thật, thấy trên máy người dùng ──
  // Từ Phần 10, nhịp nói chèn 2 câu "sửa lỗi hôm qua" do gia sư sinh ra. Chúng thuộc MẪU CÂU CỦA
  // NGÀY KHÁC. Trước khi có chốt này, nói tốt một câu như vậy làm màn chờ ghép mẫu câu hôm nay với
  // câu của hôm qua: pat "Could you + V ...?" đi cùng said "I'd like to book a table."
  it("câu KHÔNG thuộc bài (câu sửa lỗi của gia sư) → KHÔNG được ghi", () => {
    const homNay = { day: 2, drills: [{ vi: "Bạn giúp tôi được không?", en: "Could you help me?" }] };
    const p = recordSaid({ 2: done(NOW) }, homNay, "I'd like to book a table.", 0.99);
    expect(saidFor(p, 2)).toBeNull();
    expect(p).toEqual({ 2: done(NOW) });
  });

  it("câu sửa lỗi điểm cao KHÔNG ghi đè câu đúng của bài", () => {
    const homNay = { day: 2, drills: [{ vi: "x", en: "Could you help me?" }] };
    let p = recordSaid({}, homNay, "Could you help me?", 0.85);
    p = recordSaid(p, homNay, "I'd like to book a table.", 1);
    expect(saidFor(p, 2)).toBe("Could you help me?");
  });

  it("so khớp bỏ qua hoa thường và khoảng trắng thừa", () => {
    const p = recordSaid({}, BAI, "  i'd LIKE a   tea.  ", 1);
    expect(saidFor(p, 1)).toBe("i'd LIKE a   tea.".trim());
  });

  it("không có lesson hoặc bài không có drill → bỏ qua", () => {
    expect(recordSaid({}, null, "x", 1)).toEqual({});
    expect(recordSaid({}, { day: 6, review: true }, "x", 1)).toEqual({});
  });
});

describe("sentencesOf", () => {
  it("gộp drills và drills2", () => {
    expect(sentencesOf({ drills: [{ en: "a" }], drills2: [{ en: "b" }] })).toEqual(["a", "b"]);
  });
  it("bài rỗng/null an toàn", () => {
    expect(sentencesOf(null)).toEqual([]);
    expect(sentencesOf({ review: true })).toEqual([]);
  });
});

describe("learnedPatterns — bằng chứng tiến bộ", () => {
  // Bài PHẢI có drills: `saidOf` đối chiếu câu đã lưu với drill của chính bài đó, nên một fixture
  // không drill sẽ luôn trả null và che mất thứ đang cần kiểm.
  const lessons = [
    { day: 1, week: 1, pat: "P1", patVi: "V1", drills: [{ vi: "x", en: "I'd like a tea." }] },
    { day: 2, week: 1, pat: "P2", patVi: "V2", drills: [{ vi: "y", en: "Could you help me?" }] },
    { day: 6, week: 1, review: true },
  ];

  it("chỉ bài đã xong lõi, mới nhất lên đầu", () => {
    const p = { 1: done(at(1)), 2: done(NOW) };
    expect(learnedPatterns(lessons, p).map((x) => x.day)).toEqual([2, 1]);
  });

  it("kèm câu người học đã nói", () => {
    let p = { 1: done(NOW) };
    p = recordSaid(p, lessons[0], "I'd like a tea.", 1);
    expect(learnedPatterns(lessons, p)[0].said).toBe("I'd like a tea.");
  });

  it("example = câu mình nói được; chưa nói được thì lấy drill đầu của ĐÚNG bài đó", () => {
    const ls = [{ day: 1, week: 1, pat: "P1", patVi: "V1", drills: [{ vi: "x", en: "Drill one." }] }];
    const chuaNoi = learnedPatterns(ls, { 1: done(NOW) })[0];
    expect(chuaNoi.example).toBe("Drill one.");

    const p = recordSaid({ 1: done(NOW) }, ls[0], "Drill one.", 1);
    expect(learnedPatterns(ls, p)[0].example).toBe("Drill one.");
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

describe("weekDays / weekCount — dải 7 ô T2…CN", () => {
  // 2026-09-23 là thứ Tư. Dùng giờ trưa để không dính biên ngày.
  const THU4 = new Date(2026, 8, 23, 12, 0, 0).getTime();
  const D = 86400000;

  it("luôn 7 ô, nhãn T2 → CN", () => {
    const w = weekDays({}, THU4);
    expect(w).toHaveLength(7);
    expect(w.map((x) => x.label)).toEqual(WEEK_LABELS);
  });

  it("đánh dấu đúng ô hôm nay", () => {
    const w = weekDays({}, THU4);
    expect(w.filter((x) => x.today)).toHaveLength(1);
    expect(w.find((x) => x.today).label).toBe("T4");
  });

  it("ngày sau hôm nay được đánh dấu future", () => {
    const w = weekDays({}, THU4);
    expect(w.filter((x) => x.future).map((x) => x.label)).toEqual(["T5", "T6", "T7", "CN"]);
  });

  it("NGHỈ GIỮA TUẦN không xoá gì — học T2, nghỉ T3, học T4 vẫn là 2", () => {
    const p = { 1: done(THU4 - 2 * D), 2: done(THU4) };
    const w = weekDays(p, THU4);
    expect(w.map((x) => x.done)).toEqual([true, false, true, false, false, false, false]);
    expect(weekCount(p, THU4)).toBe(2);
  });

  it("ngày của tuần TRƯỚC không lọt vào tuần này", () => {
    const p = { 1: done(THU4 - 5 * D) }; // thứ Sáu tuần trước
    expect(weekCount(p, THU4)).toBe(0);
    expect(weekDays(p, THU4).every((x) => !x.done)).toBe(true);
  });

  it("chủ nhật vẫn thuộc tuần đang xét, không nhảy sang tuần sau", () => {
    const CN = new Date(2026, 8, 27, 12, 0, 0).getTime();
    const w = weekDays({}, CN);
    expect(w.find((x) => x.today).label).toBe("CN");
    expect(w.filter((x) => x.future)).toHaveLength(0);
  });

  it("chưa học gì → 0", () => expect(weekCount({}, THU4)).toBe(0));
});

describe("learnedWords — từ vựng đã học", () => {
  const lessons = [
    { day: 1, week: 1, pat: "P1", words: [{ w: "refill", ipa: "/r/", m: "rót thêm", en: "A refill." }] },
    { day: 2, week: 1, pat: "P2", words: [{ w: "spell", ipa: "/s/", m: "đánh vần", en: "Spell it." }] },
    { day: 6, week: 1, review: true },
  ];
  const xong = (t, ext) => ({ steps: {}, core: true, ext: !!ext, doneAt: t });

  it("xong LÕI là từ của bài đã hiện, nhưng đánh dấu chưa vào hàng đợi ôn", () => {
    const r = learnedWords(lessons, { 1: xong(NOW, false) }, {});
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ w: "refill", day: 1, mine: false, inSrs: false });
  });

  it("làm phần mở rộng rồi thì từ vào hàng đợi ôn", () => {
    const r = learnedWords(lessons, { 1: xong(NOW, true) }, {});
    expect(r[0]).toMatchObject({ w: "refill", ipa: "/r/", m: "rót thêm", day: 1, inSrs: true });
  });

  it("chưa học xong lõi thì không hiện gì", () => {
    expect(learnedWords(lessons, { 1: { steps: {}, core: false } }, {})).toEqual([]);
  });

  it("id khớp id item của hàng đợi ôn, để tra được mức thuộc", () => {
    expect(learnedWords(lessons, { 1: xong(NOW, true) }, {})[0].id).toBe("word::1::refill");
  });

  it("countLearnedWords CHỈ đếm từ đang thật sự được ôn", () => {
    const p = { 1: xong(NOW, false), 2: xong(NOW, true) };
    expect(learnedWords(lessons, p, {})).toHaveLength(2);
    expect(countLearnedWords(lessons, p, {})).toBe(1);
  });

  it("từ tự thêm vào NGAY, không cần điều kiện gì", () => {
    const r = learnedWords(lessons, {}, { 3: [{ w: "How much is this?", m: "cái này bao nhiêu" }] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ w: "How much is this?", mine: true, day: 3 });
  });

  it("ngày mới lên đầu; cùng ngày thì từ tự thêm đứng trước", () => {
    const p = { 1: xong(NOW, true), 2: xong(NOW, true) };
    const r = learnedWords(lessons, p, { 2: [{ w: "mine2" }] });
    expect(r.map((x) => x.w)).toEqual(["mine2", "spell", "refill"]);
  });

  it("ngày chốt tuần không có từ", () => {
    expect(learnedWords(lessons, { 6: xong(NOW, true) }, {})).toEqual([]);
  });

  it("dữ liệu rỗng/hỏng an toàn", () => {
    expect(learnedWords()).toEqual([]);
    expect(learnedWords(lessons, {}, { 1: null })).toEqual([]);
    expect(learnedWords(lessons, {}, { 1: [{ w: "  " }, {}] })).toEqual([]);
  });

  it("từ tự thêm luôn nằm trong hàng đợi ôn", () => {
    const p = { 1: xong(NOW, true), 2: xong(NOW, true) };
    expect(countLearnedWords(lessons, p, { 2: [{ w: "x" }] })).toBe(3);
  });
});

describe("saidOf — dọn dữ liệu sai đã lỡ lưu từ bản cũ", () => {
  const bai2 = { day: 2, pat: "Could you + V ...?", drills: [{ vi: "x", en: "Could you help me?" }] };

  it("câu ĐÚNG bài thì trả về bình thường", () => {
    const p = { 2: { core: true, saidBest: "Could you help me?" } };
    expect(saidOf(p, bai2)).toBe("Could you help me?");
  });

  // Đây chính là thứ người dùng vẫn thấy sau khi tôi chặn đường ghi: chặn ghi KHÔNG dọn được
  // câu đã lưu từ trước. Máy chạy bản cũ vẫn còn "I'd like to book a table." ở bài 2.
  it("câu của bài KHÁC còn sót lại từ bản cũ → bỏ, không hiện", () => {
    const p = { 2: { core: true, saidBest: "I'd like to book a table." } };
    expect(saidOf(p, bai2)).toBeNull();
  });

  it("learnedPatterns không bao giờ ghép mẫu câu với câu của bài khác", () => {
    const lessons = [bai2];
    const p = { 2: { core: true, doneAt: NOW, saidBest: "I'd like to book a table." } };
    const r = learnedPatterns(lessons, p)[0];
    expect(r.said).toBeNull();
    expect(r.example).toBe("Could you help me?"); // rơi về drill của chính bài đó
  });

  it("chưa nói gì / bài không có drill → null, không ném lỗi", () => {
    expect(saidOf({}, bai2)).toBeNull();
    expect(saidOf({ 6: { saidBest: "x" } }, { day: 6, review: true })).toBeNull();
    expect(saidOf(null, null)).toBeNull();
  });
});

describe("ngayNghi — quãng trống trước khi quay lại", () => {
  const D = 86400000;
  const T = new Date(2026, 8, 23, 12, 0, 0).getTime(); // thứ Tư

  it("học hôm nay → 0", () => expect(ngayNghi({ 1: done(T) }, T)).toBe(0));
  it("học hôm qua → 0, vẫn là liền mạch", () => expect(ngayNghi({ 1: done(T - D) }, T)).toBe(0));
  it("nghỉ đúng một ngày → 1", () => expect(ngayNghi({ 1: done(T - 2 * D) }, T)).toBe(1));
  it("nghỉ bốn ngày → 4", () => expect(ngayNghi({ 1: done(T - 5 * D) }, T)).toBe(4));

  it("tính từ lần học GẦN NHẤT, không phải lần đầu", () => {
    expect(ngayNghi({ 1: done(T - 30 * D), 2: done(T - 3 * D) }, T)).toBe(2);
  });

  it("chưa học gì bao giờ → 0, không coi người mới là người bỏ cuộc", () => {
    expect(ngayNghi({}, T)).toBe(0);
    expect(ngayNghi({ 1: { core: false } }, T)).toBe(0);
  });
});
