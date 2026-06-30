import { describe, expect, it } from "vitest";
import { recordReview, todayReviewedFor, streakFor, emptyStats } from "./stats.js";

// Dùng giờ trưa để tránh biên DST khi cộng/trừ DAY.
const day = (y, m, d) => new Date(y, m, d, 12, 0, 0).getTime();
const D1 = day(2026, 5, 1);
const D2 = day(2026, 5, 2);
const D4 = day(2026, 5, 4);

describe("recordReview (§5.8)", () => {
  it("lần đầu → streak 1, todayReviewed 1", () => {
    const s = recordReview(emptyStats(), D1);
    expect(s.streak).toBe(1);
    expect(s.todayReviewed).toBe(1);
  });

  it("cùng ngày → todayReviewed tăng, streak giữ nguyên", () => {
    let s = recordReview(emptyStats(), D1);
    s = recordReview(s, D1);
    expect(s.todayReviewed).toBe(2);
    expect(s.streak).toBe(1);
  });

  it("ngày kế liên tiếp → streak +1, todayReviewed reset 1", () => {
    let s = recordReview(emptyStats(), D1);
    s = recordReview(s, D2);
    expect(s.streak).toBe(2);
    expect(s.todayReviewed).toBe(1);
  });

  it("cách quãng (nghỉ 1+ ngày) → streak về 1", () => {
    let s = recordReview(emptyStats(), D1);
    s = recordReview(s, D4); // nhảy 3 ngày
    expect(s.streak).toBe(1);
  });
});

describe("hiển thị theo now", () => {
  it("todayReviewedFor = 0 nếu lastDay không phải hôm nay", () => {
    const s = recordReview(emptyStats(), D1);
    expect(todayReviewedFor(s, D1)).toBe(1);
    expect(todayReviewedFor(s, D2)).toBe(0); // sang ngày mới, chưa ôn
  });

  it("streakFor: còn sống nếu học hôm nay/hôm qua, đứt nếu cũ hơn", () => {
    const s = recordReview(emptyStats(), D1); // streak 1, lastDay D1
    expect(streakFor(s, D1)).toBe(1); // hôm nay
    expect(streakFor(s, D2)).toBe(1); // hôm qua → còn sống
    expect(streakFor(s, D4)).toBe(0); // cách quãng → đứt
  });
});
