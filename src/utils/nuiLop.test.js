import { describe, expect, it } from "vitest";
import { chiaLop, NGUONG_NGAY, NGAY_LE, TUAN_TOI_DA, NGAY_TUAN, NGAY_THANG } from "./nuiLop.js";

const tong = (a) => a.reduce((s, x) => s + x, 0);

describe("chiaLop", () => {
  it("0 ngày → không lớp nào", () => {
    expect(chiaLop(0)).toEqual([]);
    expect(chiaLop(null)).toEqual([]);
    expect(chiaLop(-5)).toEqual([]);
  });

  it("dưới ngưỡng thì MỖI NGÀY một lớp", () => {
    expect(chiaLop(1)).toEqual([1]);
    expect(chiaLop(7)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(chiaLop(NGUONG_NGAY)).toHaveLength(NGUONG_NGAY);
    expect(chiaLop(NGUONG_NGAY).every((x) => x === 1)).toBe(true);
  });

  // Bất biến quan trọng nhất: không được làm mất hay đẻ thêm ngày nào.
  it("tổng số ngày LUÔN khớp, ở mọi kích cỡ", () => {
    for (const n of [1, 6, 14, 15, 20, 30, 50, 91, 100, 200, 365, 1000]) {
      expect(tong(chiaLop(n))).toBe(n);
    }
  });

  it("quá ngưỡng: 7 ngày gần nhất vẫn đếm từng ngày", () => {
    const l = chiaLop(30);
    expect(l.slice(-NGAY_LE)).toEqual(Array(NGAY_LE).fill(1));
  });

  it("phần cũ gộp theo tuần, nhóm LẺ nằm ở chỗ cũ nhất", () => {
    // 30 = 2 (lẻ, cũ nhất) + 3×7 + 7 ngày lẻ gần nhất
    expect(chiaLop(30)).toEqual([2, 7, 7, 7, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("quá 12 tuần thì phần cũ nhất lùi về đơn vị THÁNG", () => {
    const l = chiaLop(365);
    expect(tong(l)).toBe(365);
    expect(l.some((x) => x === NGAY_THANG)).toBe(true);
    expect(l.filter((x) => x === NGAY_TUAN)).toHaveLength(TUAN_TOI_DA);
    expect(l.slice(-NGAY_LE)).toEqual(Array(NGAY_LE).fill(1));
  });

  it("lớp CŨ hơn thì gộp DÀY hơn — không bao giờ ngược lại", () => {
    for (const n of [30, 100, 365, 1000]) {
      const l = chiaLop(n);
      // bỏ nhóm lẻ đầu tiên (nó là phần dư nên có thể nhỏ), phần còn lại phải không tăng dần
      const than = l.slice(1);
      for (let i = 1; i < than.length; i++) {
        expect(than[i]).toBeLessThanOrEqual(than[i - 1]);
      }
    }
  });

  it("số lớp không phình theo số ngày — 365 ngày vẫn vẽ được", () => {
    expect(chiaLop(365).length).toBeLessThan(35);
    expect(chiaLop(1000).length).toBeLessThan(60);
  });
});
