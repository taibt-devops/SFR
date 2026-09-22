// Ràng buộc nội dung L1–L5 (spec §2.2). Chạy trên MỌI bài đã soạn → soạn tuần mới mà sai là đỏ ngay.
import { describe, it, expect } from "vitest";
import { lessons, lessonByDay } from "./index.js";
import { outline, TOTAL_DAYS } from "./outline.js";

// Có xuất hiện `needle` như một cụm trọn vẹn trong `hay` không (không tính nửa từ).
function hasPhrase(hay, needle) {
  const esc = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(String(hay));
}

const teaching = lessons.filter((l) => !l.review);
const allSentences = (l) => [
  ...l.ex.map((e) => e.en),
  ...l.drills.map((d) => d.en),
  ...l.words.map((w) => w.en),
  ...(l.drills2 || []).map((d) => d.en),
];

describe("L1 — day duy nhất, liên tục, week = ceil(day/6)", () => {
  it("không trùng day, không lỗ hổng, bắt đầu từ 1", () => {
    const days = lessons.map((l) => l.day);
    expect(new Set(days).size).toBe(days.length);
    expect(days).toEqual(days.map((_, i) => i + 1));
  });

  it("week khớp công thức và khớp outline", () => {
    for (const l of lessons) {
      expect(l.week).toBe(Math.ceil(l.day / 6));
      expect(outline.find((o) => o.day === l.day)?.week).toBe(l.week);
    }
  });

  it("outline phủ đủ 72 ngày", () => {
    expect(TOTAL_DAYS).toBe(72);
    expect(outline.map((o) => o.day)).toEqual(outline.map((_, i) => i + 1));
  });
});

describe("L2 — drills lõi KHÔNG dùng từ của phần mở rộng", () => {
  // Lõi 15' phải chạy độc lập: bỏ qua nhịp 3 (từ mới) thì nhịp 4 vẫn nói được.
  it.each(teaching.map((l) => [l.day, l]))("ngày %i", (_day, l) => {
    for (const d of l.drills) {
      for (const w of l.words) {
        expect(hasPhrase(d.en, w.w), `drill "${d.en}" dùng từ mở rộng "${w.w}"`).toBe(false);
      }
    }
  });
});

describe("L3 — ngân sách 15'/10'", () => {
  it.each(teaching.map((l) => [l.day, l]))("ngày %i", (_day, l) => {
    expect(l.ex.length).toBeGreaterThanOrEqual(4);
    expect(l.drills.length).toBe(5);
    expect(l.words.length).toBeLessThanOrEqual(6);
    expect((l.drills2 || []).length).toBeLessThanOrEqual(2);
  });
});

describe("L4 — mọi câu đều bám mẫu câu (patKey)", () => {
  it.each(teaching.map((l) => [l.day, l]))("ngày %i", (_day, l) => {
    expect(l.patKey, `ngày ${l.day} thiếu patKey`).toBeTruthy();
    for (const s of allSentences(l)) {
      expect(hasPhrase(s, l.patKey), `"${s}" không chứa mẫu "${l.patKey}"`).toBe(true);
    }
  });
});

describe("L5 — ngày chốt tuần", () => {
  it("day % 6 === 0 là review, không có mẫu câu mới", () => {
    for (const l of lessons) {
      if (l.day % 6 === 0) {
        expect(l.review).toBe(true);
        expect(l.pat).toBeUndefined();
      } else {
        expect(l.review).toBeUndefined();
        expect(l.pat).toBeTruthy();
      }
    }
  });

  it("outline đánh dấu review ở đúng các ngày đó", () => {
    for (const o of outline) expect(!!o.review).toBe(o.day % 6 === 0);
  });
});

describe("hình dạng dữ liệu", () => {
  it("mỗi bài dạy có đủ trường bắt buộc", () => {
    for (const l of teaching) {
      expect(l).toMatchObject({
        day: expect.any(Number),
        title: expect.any(String),
        pat: expect.any(String),
        patVi: expect.any(String),
        note: expect.any(String),
        scene: expect.any(String),
        track: expect.stringMatching(/^(daily|work)$/),
      });
      for (const w of l.words) {
        expect(w.w && w.ipa && w.m && w.en && w.vi, `từ thiếu trường ở ngày ${l.day}`).toBeTruthy();
      }
      for (const d of [...l.drills, ...(l.drills2 || [])]) {
        expect(d.vi && d.en, `drill thiếu vi/en ở ngày ${l.day}`).toBeTruthy();
      }
    }
  });

  it("lessonByDay tra đúng bài", () => {
    expect(lessonByDay(1).pat).toBe("I'd like + N / to V");
    expect(lessonByDay(6).review).toBe(true);
    expect(lessonByDay(999)).toBeUndefined();
  });
});
