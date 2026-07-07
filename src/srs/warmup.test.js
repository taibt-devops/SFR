import { describe, expect, it } from "vitest";
import { addWarmup, warmupToday, warmupTrend } from "./warmup.js";

const DAY = 24 * 60 * 60 * 1000;
// now cố định giữa ngày (test tất định, tránh lệch mốc 00:00)
const NOW = new Date(2026, 6, 7, 12, 0, 0).getTime();
const entry = (at, wpm = 80, fillers = 2) => ({ at, words: 100, seconds: 60, wpm, fillers });

describe("addWarmup", () => {
  it("thêm vào ĐẦU, không mutate mảng cũ", () => {
    const old = [entry(NOW - DAY)];
    const next = addWarmup(old, entry(NOW));
    expect(next).toHaveLength(2);
    expect(next[0].at).toBe(NOW);
    expect(old).toHaveLength(1);
  });

  it("cắt còn tối đa 60 bản ghi", () => {
    let list = [];
    for (let i = 0; i < 70; i++) list = addWarmup(list, entry(NOW - i));
    expect(list).toHaveLength(60);
  });
});

describe("warmupToday", () => {
  it("true khi có bản ghi cùng ngày (giờ khác nhau), false khi chỉ có hôm qua / rỗng", () => {
    expect(warmupToday([entry(NOW - 3 * 60 * 60 * 1000)], NOW)).toBe(true); // sáng cùng ngày
    expect(warmupToday([entry(NOW - DAY)], NOW)).toBe(false);
    expect(warmupToday([], NOW)).toBe(false);
  });
});

describe("warmupTrend", () => {
  it("gom theo ngày (lấy lần wpm cao nhất), sắp cũ → mới, tối đa n ngày", () => {
    const list = [
      entry(NOW, 90),
      entry(NOW - 60_000, 70), // cùng ngày, wpm thấp hơn → bị thay
      entry(NOW - DAY, 60),
      entry(NOW - 2 * DAY, 50),
    ];
    const t = warmupTrend(list, 2);
    expect(t).toHaveLength(2); // chỉ 2 ngày gần nhất
    expect(t[0].wpm).toBe(60); // hôm qua trước
    expect(t[1].wpm).toBe(90); // hôm nay lấy lần tốt nhất
  });
});
