import { describe, it, expect } from "vitest";
import { bumpReview, bumpSpeak, lastNDays } from "./daily.js";

const DAY = 86400000;
const D1 = new Date(2026, 0, 10, 9, 0).getTime(); // 10/01/2026 09:00 địa phương
const day = (now) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

describe("daily (biểu đồ tiến độ)", () => {
  it("bumpReview đếm lượt ôn, từ mới chỉ khi isNew; không mutate", () => {
    const m0 = {};
    const m1 = bumpReview(m0, true, D1);
    const m2 = bumpReview(m1, false, D1);
    expect(m0).toEqual({});
    expect(m2[String(day(D1))]).toEqual({ rev: 2, nw: 1, spk: 0 });
  });

  it("bumpSpeak cộng dồn giây trong ngày, bỏ qua 0/âm", () => {
    let m = bumpSpeak({}, 45, D1);
    m = bumpSpeak(m, 30.4, D1);
    m = bumpSpeak(m, 0, D1);
    expect(m[String(day(D1))].spk).toBe(75);
  });

  it("tách theo ngày: hoạt động hôm sau vào ô khác", () => {
    let m = bumpReview({}, true, D1);
    m = bumpReview(m, false, D1 + DAY);
    expect(m[String(day(D1))].rev).toBe(1);
    expect(m[String(day(D1 + DAY))].rev).toBe(1);
  });

  it("lastNDays trả đủ n ngày cũ→mới, ngày trống = 0, spkMin làm tròn 1 lẻ", () => {
    let m = bumpSpeak({}, 90, D1 - DAY); // hôm qua 1.5 phút
    m = bumpReview(m, true, D1);
    const days = lastNDays(m, 3, D1);
    expect(days).toHaveLength(3);
    expect(days[0]).toEqual({ day: day(D1 - 2 * DAY), rev: 0, nw: 0, spkMin: 0 });
    expect(days[1].spkMin).toBe(1.5);
    expect(days[2]).toMatchObject({ rev: 1, nw: 1 });
  });

  it("prune: ngày quá 90 ngày bị cắt khi ghi mới", () => {
    const old = { [String(day(D1 - 91 * DAY))]: { rev: 5, nw: 0, spk: 0 } };
    const m = bumpReview(old, false, D1);
    expect(Object.keys(m)).toHaveLength(1);
  });
});
