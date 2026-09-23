import { describe, expect, it } from "vitest";
import { caoNui, chonMocGop, vanhLop, tiLe, K_CAO, DAI_TOI_THIEU, MOC_GOP, DANG } from "./nuiLop.js";

describe("caoNui", () => {
  it("cao theo căn bậc hai của số ngày", () => {
    expect(caoNui(1)).toBeCloseTo(K_CAO);
    expect(caoNui(4)).toBeCloseTo(K_CAO * 2);
    expect(caoNui(100)).toBeCloseTo(K_CAO * 10);
  });

  // Đây là lời hứa của cả hình vẽ: mỗi ngày góp một phần BẰNG NHAU vào diện tích.
  it("diện tích tỉ lệ THẲNG với số ngày", () => {
    const dt = (n) => caoNui(n) ** 2;
    expect(dt(20) / dt(10)).toBeCloseTo(2);
    expect(dt(300) / dt(100)).toBeCloseTo(3);
  });

  it("0 hoặc dữ liệu hỏng → 0, không NaN", () => {
    expect(caoNui(0)).toBe(0);
    expect(caoNui(-5)).toBe(0);
    expect(caoNui(null)).toBe(0);
    expect(caoNui(undefined)).toBe(0);
  });
});

describe("chonMocGop", () => {
  it("ít ngày thì vẫn đếm theo NGÀY", () => {
    expect(chonMocGop(3, 1)).toBe(1);
    expect(chonMocGop(10, 1)).toBe(1);
  });

  it("càng nhiều ngày càng phải gộp thô hơn", () => {
    const g = MOC_GOP.map((_, i) => chonMocGop([5, 60, 400, 3000][Math.min(i, 3)], 1));
    // không kiểm giá trị cứng — chỉ kiểm KHÔNG BAO GIỜ đi ngược
    for (let i = 1; i < g.length; i++) expect(g[i]).toBeGreaterThanOrEqual(g[i - 1]);
  });

  it("thu nhỏ khung → phải gộp thô hơn để dải còn nhìn thấy", () => {
    expect(chonMocGop(300, 0.2)).toBeGreaterThanOrEqual(chonMocGop(300, 1));
  });

  it("luôn trả một mốc hợp lệ", () => {
    for (const n of [1, 7, 50, 365, 5000]) {
      expect(MOC_GOP).toContain(chonMocGop(n, 1));
    }
  });
});

describe("vanhLop", () => {
  it("vành ĐẦU luôn là số ngày hiện tại — lớp ngoài cùng là mới nhất", () => {
    expect(vanhLop(12, 1)[0]).toBe(12);
    expect(vanhLop(300, 30)[0]).toBe(300);
  });

  it("giảm dần, không trùng, không vượt quá số ngày", () => {
    for (const [n, g] of [[12, 1], [30, 7], [365, 30], [1000, 90]]) {
      const v = vanhLop(n, g);
      expect(new Set(v).size).toBe(v.length);
      for (let i = 1; i < v.length; i++) expect(v[i]).toBeLessThan(v[i - 1]);
      expect(Math.max(...v)).toBeLessThanOrEqual(n);
      expect(Math.min(...v)).toBeGreaterThanOrEqual(1);
    }
  });

  // Nếu không bỏ, sẽ có một sợi chỉ dính sát vành ngoài — trông như lỗi vẽ chứ không như một lớp.
  it("BỎ vành mỏng hơn nửa mức gộp ở sát mép ngoài", () => {
    expect(vanhLop(30, 7)).toEqual([30, 21, 14, 7]); // 28 bị bỏ vì chỉ cách 30 có 2 ngày
  });

  it("0 ngày → không vành nào", () => {
    expect(vanhLop(0, 1)).toEqual([]);
    expect(vanhLop(null, 7)).toEqual([]);
  });

  // Phải đo ở TỈ LỆ THẬT. Lần đầu tôi truyền s=1 cho 1000 ngày — tỉ lệ đó không bao giờ xảy ra
  // (khung 324px thì 1000 ngày vẽ ở ×0.09) nên test báo 143 vành và tố cáo nhầm thuật toán.
  it("số vành không phình theo số ngày, đo ở tỉ lệ thật", () => {
    for (const n of [7, 30, 100, 365, 1000, 3000]) {
      const s = tiLe(n, { rongKhung: 324, caoToiDa: 110 });
      expect(vanhLop(n, chonMocGop(n, s)).length).toBeLessThanOrEqual(16);
    }
  });
});

describe("tiLe", () => {
  it("núi nhỏ thì không phóng to quá cỡ thật", () => {
    expect(tiLe(1, { rongKhung: 324, caoToiDa: 110 })).toBe(1);
  });

  // Chạm trần thì LÙI CAMERA, không cắt ngọn — cắt ngọn là nói dối về chiều cao.
  it("núi cao quá trần thì thu nhỏ lại, không cắt", () => {
    const s = tiLe(365, { rongKhung: 324, caoToiDa: 110 });
    expect(s).toBeLessThan(1);
    expect(caoNui(365) * s).toBeLessThanOrEqual(110 + 0.001);
  });

  it("khung hẹp cũng ép thu nhỏ", () => {
    const hep = tiLe(100, { rongKhung: 120, caoToiDa: 999 });
    const rong = tiLe(100, { rongKhung: 900, caoToiDa: 999 });
    expect(hep).toBeLessThan(rong);
  });

  it("càng nhiều ngày tỉ lệ càng nhỏ — không bao giờ tăng", () => {
    let truoc = Infinity;
    for (const n of [1, 10, 50, 200, 500, 2000]) {
      const s = tiLe(n, { rongKhung: 324, caoToiDa: 110 });
      expect(s).toBeLessThanOrEqual(truoc + 1e-9);
      truoc = s;
    }
  });
});

describe("DANG — dáng núi", () => {
  it("bắt đầu và kết thúc ở mặt đất, có đúng một đỉnh", () => {
    expect(DANG[0][1]).toBe(0);
    expect(DANG[DANG.length - 1][1]).toBe(0);
    expect(DANG.filter((p) => p[1] === 1)).toHaveLength(1);
  });

  it("lệch một bên — núi cân đối tuyệt đối trông như cái nón", () => {
    const dinh = DANG.findIndex((p) => p[1] === 1);
    expect(dinh).not.toBe(Math.floor(DANG.length / 2));
  });

  it("x tăng dần, nằm trong biên chân núi", () => {
    for (let i = 1; i < DANG.length; i++) expect(DANG[i][0]).toBeGreaterThan(DANG[i - 1][0]);
    expect(Math.abs(DANG[0][0])).toBeCloseTo(Math.abs(DANG[DANG.length - 1][0]));
  });
});

describe("DAI_TOI_THIEU", () => {
  it("mọi dải ở mức gộp đã chọn đều đạt bề rộng tối thiểu", () => {
    for (const n of [30, 100, 365, 1000]) {
      const s = tiLe(n, { rongKhung: 324, caoToiDa: 110 });
      const g = chonMocGop(n, s);
      const v = vanhLop(n, g);
      // dải ngoài cùng là chỗ hẹp nhất và cũng là chỗ quan trọng nhất
      if (v.length > 1) {
        expect((caoNui(v[0]) - caoNui(v[1])) * s).toBeGreaterThanOrEqual(DAI_TOI_THIEU - 0.5);
      }
    }
  });
});
