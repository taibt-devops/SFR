import { describe, it, expect } from "vitest";
import { itemsOf, itemsFor, patItem, wordItems, myWordItems, promptFor, parseId, patId, wordId, PAT, WORD } from "./items.js";
import { buildSession } from "./sm2.js";

const lesson = {
  day: 3,
  week: 1,
  track: "daily",
  pat: "I'm looking for + N",
  patKey: "I'm looking for",
  patVi: "Tôi đang tìm...",
  drills: [
    { vi: "A", en: "I'm looking for a." },
    { vi: "B", en: "I'm looking for b." },
    { vi: "C", en: "I'm looking for c." },
  ],
  words: [
    { w: "exit", ipa: "/x/", m: "(n) lối ra", en: "I'm looking for the exit.", vi: "Tìm lối ra." },
    { w: "ATM", ipa: "/y/", m: "(n) máy rút tiền", en: "I'm looking for an ATM.", vi: "Tìm ATM." },
  ],
};
const reviewDay = { day: 6, week: 1, track: "daily", title: "Chốt tuần", review: true };

describe("id", () => {
  it("sinh và tách lại được", () => {
    expect(patId(3)).toBe("pat::3");
    expect(wordId(3, "exit")).toBe("word::3::exit");
    expect(parseId("pat::3")).toEqual({ kind: PAT, day: 3, w: null });
    expect(parseId("word::3::exit")).toEqual({ kind: WORD, day: 3, w: "exit" });
    expect(parseId("Con người::reliable")).toBeNull(); // id kiểu cũ → không nhận
  });
});

describe("patItem / wordItems", () => {
  it("bài dạy sinh 1 item mẫu câu, mang đủ biến thể", () => {
    const it0 = patItem(lesson);
    expect(it0.id).toBe("pat::3");
    expect(it0.kind).toBe(PAT);
    expect(it0.variants).toHaveLength(3);
  });

  it("ngày chốt tuần KHÔNG sinh item nào", () => {
    expect(patItem(reviewDay)).toBeNull();
    expect(wordItems(reviewDay)).toEqual([]);
    expect(itemsOf(reviewDay, { includeWords: true })).toEqual([]);
  });

  it("mỗi từ một item", () => {
    expect(wordItems(lesson).map((i) => i.id)).toEqual(["word::3::exit", "word::3::ATM"]);
  });
});

describe("itemsOf — từ vựng chỉ vào khi đã làm nhịp 3", () => {
  it("mặc định chỉ có mẫu câu", () => {
    expect(itemsOf(lesson).map((i) => i.id)).toEqual(["pat::3"]);
  });

  it("includeWords → thêm item từ", () => {
    expect(itemsOf(lesson, { includeWords: true })).toHaveLength(3);
  });
});

describe("itemsFor — lọc theo tiến độ khoá", () => {
  const lessons = [{ ...lesson, day: 1 }, { ...lesson, day: 2 }, reviewDay];

  it("bài chưa xong lõi thì chưa sinh item (không ôn thứ chưa được dạy)", () => {
    expect(itemsFor(lessons, {})).toEqual([]);
    expect(itemsFor(lessons, { 1: { core: false, ext: true } })).toEqual([]);
  });

  it("xong lõi → có item mẫu câu; xong mở rộng → có thêm item từ", () => {
    expect(itemsFor(lessons, { 1: { core: true } }).map((i) => i.id)).toEqual(["pat::1"]);
    expect(itemsFor(lessons, { 1: { core: true, ext: true } })).toHaveLength(3);
  });

  it("gộp nhiều ngày, bỏ qua ngày chốt tuần", () => {
    const got = itemsFor(lessons, { 1: { core: true }, 2: { core: true }, 6: { core: true } });
    expect(got.map((i) => i.id)).toEqual(["pat::1", "pat::2"]);
  });
});

describe("promptFor — tất định theo reps", () => {
  it("xoay vòng biến thể, không lặp mãi một câu", () => {
    const it0 = patItem(lesson);
    expect(promptFor(it0, { reps: 0 }).en).toBe("I'm looking for a.");
    expect(promptFor(it0, { reps: 1 }).en).toBe("I'm looking for b.");
    expect(promptFor(it0, { reps: 3 }).en).toBe("I'm looking for a."); // quay lại đầu
  });

  it("state thiếu / reps âm → biến thể đầu", () => {
    const it0 = patItem(lesson);
    expect(promptFor(it0, undefined).en).toBe("I'm looking for a.");
    expect(promptFor(it0, { reps: -5 }).en).toBe("I'm looking for a.");
  });

  it("item không có biến thể → null", () => {
    expect(promptFor({ variants: [] }, { reps: 0 })).toBeNull();
  });
});

describe("ráp được vào SM-2 mà không sửa sm2.js (C1)", () => {
  it("buildSession nhận item như thẻ thường", () => {
    const items = itemsFor([{ ...lesson, day: 1 }], { 1: { core: true, ext: true } });
    const session = buildSession(items, () => null, { newLimit: 10, maxReviews: 10, now: 0 });
    expect(session).toHaveLength(3); // chưa có state → đều là item mới
    expect(session.every((c) => typeof c.id === "string")).toBe(true);
  });
});

describe("từ người học tự thêm (spec §2.5)", () => {
  const lessons = [{ ...lesson, day: 1 }];
  const mine = { 1: [{ w: "napkin", m: "khăn giấy", en: "Could I have a napkin?" }] };

  it("vào hàng đợi NGAY, không cần xong lõi hay nhịp 3 (ngoại lệ cố ý của §2.3)", () => {
    const got = itemsFor(lessons, {}, mine);
    expect(got.map((i) => i.id)).toEqual(["word::1::napkin"]);
    expect(got[0].mine).toBe(true);
  });

  it("hỏi bằng nghĩa, đáp bằng chính câu đã gặp từ đó", () => {
    const it0 = itemsFor(lessons, {}, mine)[0];
    expect(promptFor(it0, null)).toEqual({ vi: "khăn giấy", en: "Could I have a napkin?" });
  });

  it("thiếu nghĩa/câu thì vẫn dùng được, không sinh undefined", () => {
    const got = myWordItems(2, [{ w: "solo" }]);
    expect(got[0].sub).toBe("(từ bạn tự thêm)");
    expect(promptFor(got[0], null)).toEqual({ vi: "solo", en: "solo" });
  });

  it("trùng tên với từ CỦA BÀI thì không nhân đôi id", () => {
    const dup = { 1: [{ w: "exit", m: "loi ra" }] };
    const got = itemsFor(lessons, { 1: { core: true, ext: true } }, dup);
    expect(got.filter((i) => i.id === "word::1::exit")).toHaveLength(1);
  });

  it("gộp chung với item của bài", () => {
    const got = itemsFor(lessons, { 1: { core: true, ext: true } }, mine);
    expect(got.map((i) => i.id)).toContain("pat::1");
    expect(got.map((i) => i.id)).toContain("word::1::napkin");
  });

  it("không có từ tự thêm → hành vi cũ giữ nguyên", () => {
    expect(itemsFor(lessons, { 1: { core: true } }).map((i) => i.id)).toEqual(["pat::1"]);
  });
});
