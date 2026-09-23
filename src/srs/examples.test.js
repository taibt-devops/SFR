import { beforeEach, describe, expect, it } from "vitest";
import {
  loadEx, saveEx, addEx, exFor, sanitizeEx, khoaTu, EX_KEY, TOI_DA_TU, TOI_DA_CAU,
} from "./examples.js";

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
const NOW = 1_700_000_000_000;
const VD = [{ en: "Can I get a refill?", vi: "Cho tôi thêm một ly nữa được không?" }];

beforeEach(() => { globalThis.localStorage = mockLocalStorage(); });

describe("load / save", () => {
  it("chưa có gì → rỗng", () => expect(loadEx()).toEqual({}));

  it("lưu rồi đọc lại", () => {
    saveEx(addEx({}, "refill", VD, NOW));
    expect(exFor(loadEx(), "refill")[0].en).toBe("Can I get a refill?");
    expect(localStorage.getItem(EX_KEY)).toBeTruthy();
  });

  it("JSON hỏng hoặc kiểu sai → rỗng, không ném lỗi", () => {
    localStorage.setItem(EX_KEY, "{{{");
    expect(loadEx()).toEqual({});
    localStorage.setItem(EX_KEY, "[1,2]");
    expect(loadEx()).toEqual({});
  });
});

describe("sanitizeEx", () => {
  it("cắt khoảng trắng, giữ đúng khuôn", () => {
    expect(sanitizeEx([{ en: "  Hi there.  ", vi: " Chào bạn. " }])).toEqual([
      { en: "Hi there.", vi: "Chào bạn." },
    ]);
  });

  it("bỏ câu không có phần tiếng Anh — có dịch mà không có câu thì vô dụng", () => {
    expect(sanitizeEx([{ vi: "Chào bạn." }, { en: "   " }, { en: "Ok." }])).toEqual([
      { en: "Ok.", vi: "" },
    ]);
  });

  it("hình thù lạ từ LLM → rỗng, không ném lỗi", () => {
    expect(sanitizeEx(null)).toEqual([]);
    expect(sanitizeEx("Hi there.")).toEqual([]);
    expect(sanitizeEx([["Hi"], 42, null])).toEqual([]);
  });

  it("cắt theo giới hạn", () => {
    const nhieu = Array.from({ length: 10 }, (_, i) => ({ en: "Line " + i }));
    expect(sanitizeEx(nhieu)).toHaveLength(TOI_DA_CAU);
  });
});

describe("addEx", () => {
  it("KHÔNG mutate tham số", () => {
    const s0 = addEx({}, "refill", VD, NOW);
    const truoc = JSON.stringify(s0);
    addEx(s0, "takeaway", VD, NOW + 1);
    expect(JSON.stringify(s0)).toBe(truoc);
  });

  it("tra được bất kể hoa thường hay khoảng trắng thừa", () => {
    const s = addEx({}, "  Double-Check ", VD, NOW);
    expect(exFor(s, "double-check")).toHaveLength(1);
    expect(exFor(s, "DOUBLE-CHECK")).toHaveLength(1);
  });

  // Hỏi lại cùng một từ hai lần thì Claude hay trả vài câu giống hệt lần trước.
  it("gộp thêm câu mới, BỎ câu trùng", () => {
    let s = addEx({}, "refill", [{ en: "A.", vi: "a" }, { en: "B.", vi: "b" }], NOW);
    s = addEx(s, "refill", [{ en: "b.", vi: "khac" }, { en: "C.", vi: "c" }], NOW + 1);
    expect(exFor(s, "refill").map((x) => x.en)).toEqual(["A.", "B.", "C."]);
  });

  it("mỗi từ giữ nhiều nhất TOI_DA_CAU câu", () => {
    let s = {};
    for (let i = 0; i < 10; i++) s = addEx(s, "refill", [{ en: "Line " + i }], NOW + i);
    expect(exFor(s, "refill")).toHaveLength(TOI_DA_CAU);
  });

  it("dữ liệu rỗng → trả store cũ nguyên vẹn", () => {
    const s = addEx({}, "refill", VD, NOW);
    expect(addEx(s, "", VD, NOW)).toBe(s);
    expect(addEx(s, "takeaway", [], NOW)).toBe(s);
    expect(addEx(s, "takeaway", null, NOW)).toBe(s);
  });

  // Không có trần thì localStorage phình dần rồi ném QuotaExceeded giữa buổi học.
  it("quá trần số TỪ thì bỏ từ lâu nhất không đụng tới", () => {
    let s = {};
    for (let i = 0; i < TOI_DA_TU + 5; i++) s = addEx(s, "tu" + i, VD, NOW + i);
    expect(Object.keys(s)).toHaveLength(TOI_DA_TU);
    expect(exFor(s, "tu0")).toEqual([]);                 // cũ nhất bị bỏ
    expect(exFor(s, "tu" + (TOI_DA_TU + 4))).toHaveLength(1); // mới nhất còn
  });
});

describe("khoaTu", () => {
  it("bỏ hoa thường, gộp khoảng trắng", () => expect(khoaTu("  Keep  An Eye ON ")).toBe("keep an eye on"));
  it("rỗng/null an toàn", () => {
    expect(khoaTu(null)).toBe("");
    expect(khoaTu(undefined)).toBe("");
  });
});
