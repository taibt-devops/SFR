import { describe, expect, it } from "vitest";
import { review, preview, isDue, buildSession, DAY } from "./sm2.js";

const NOW = 1_700_000_000_000; // mốc thời gian cố định → test tất định

describe("review() — SM-2 core", () => {
  it("(a) thẻ mới + Tốt (q=4) → interval 1, reps 1, ef 2.5, due = now + DAY", () => {
    const s = review(undefined, 4, NOW);
    expect(s.interval).toBe(1);
    expect(s.reps).toBe(1);
    expect(s.ef).toBeCloseTo(2.5, 10);
    expect(s.due).toBe(NOW + DAY);
    expect(s.seen).toBe(true);
  });

  it("(b) đúng 3 lần liên tiếp (q=4) → interval 1 → 6 → 15", () => {
    const s1 = review(undefined, 4, NOW);
    expect(s1.interval).toBe(1);
    const s2 = review(s1, 4, NOW);
    expect(s2.interval).toBe(6);
    const s3 = review(s2, 4, NOW);
    expect(s3.interval).toBe(15); // round(6 * 2.5)
  });

  it("(c) Chưa nhớ (q=2) → reps 0, lapses +1, interval 1, ef giảm", () => {
    const ok = review(undefined, 4, NOW); // reps 1, ef 2.5
    const bad = review(ok, 2, NOW);
    expect(bad.reps).toBe(0);
    expect(bad.interval).toBe(1);
    expect(bad.lapses).toBe(1);
    expect(bad.ef).toBeLessThan(ok.ef);
  });

  it("(d) ef không bao giờ xuống dưới 1.3", () => {
    let s;
    for (let i = 0; i < 20; i++) s = review(s, 2, NOW);
    expect(s.ef).toBeGreaterThanOrEqual(1.3);
    expect(s.ef).toBeCloseTo(1.3, 10);
  });

  it("(e) review() KHÔNG mutate state đầu vào", () => {
    const state = { ef: 2.5, reps: 2, interval: 6, lapses: 0, seen: true };
    const snapshot = JSON.stringify(state);
    review(state, 5, NOW);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("preview()", () => {
  it("trả số ngày mà không đổi state", () => {
    const state = { ef: 2.5, reps: 1, interval: 1, lapses: 0, seen: true };
    const snapshot = JSON.stringify(state);
    expect(preview(state, 4)).toBe(6);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("isDue()", () => {
  it("thẻ mới (chưa có state) → true", () => {
    expect(isDue(undefined, NOW)).toBe(true);
    expect(isDue({ seen: false }, NOW)).toBe(true);
  });
  it("đã seen: so sánh due với now", () => {
    expect(isDue({ seen: true, due: NOW - 1 }, NOW)).toBe(true);
    expect(isDue({ seen: true, due: NOW + 1 }, NOW)).toBe(false);
  });
});

describe("buildSession()", () => {
  const cards = [];
  for (let i = 0; i < 30; i++) cards.push({ id: "Công việc::w" + i, c: "Công việc" });
  for (let i = 0; i < 30; i++) cards.push({ id: "Cảm xúc::w" + i, c: "Cảm xúc" });

  it("giới hạn thẻ mới theo newLimit", () => {
    const out = buildSession(cards, () => undefined, { newLimit: 5, now: NOW });
    expect(out).toHaveLength(5); // tất cả là thẻ mới, không có due
  });

  it("lọc đúng scope (chủ đề)", () => {
    const out = buildSession(cards, () => undefined, {
      newLimit: 100,
      scope: "Cảm xúc",
      now: NOW,
    });
    expect(out.every((c) => c.c === "Cảm xúc")).toBe(true);
    expect(out).toHaveLength(30);
  });

  it("giới hạn thẻ đến hạn theo maxReviews", () => {
    const due = { seen: true, due: NOW - DAY }; // mọi thẻ đều đến hạn
    const out = buildSession(cards, () => due, { newLimit: 0, maxReviews: 10, now: NOW });
    expect(out).toHaveLength(10);
  });
});
