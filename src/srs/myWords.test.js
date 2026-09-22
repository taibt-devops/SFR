import { beforeEach, describe, expect, it } from "vitest";
import {
  loadMyWords, saveMyWords, addMyWord, removeMyWord, myWordsFor, countMyWords, normWord, MYWORDS_KEY,
} from "./myWords.js";

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
const NOW = 1_700_000_000_000;

beforeEach(() => {
  globalThis.localStorage = mockLocalStorage();
});

describe("load / save", () => {
  it("chưa có gì → rỗng", () => expect(loadMyWords()).toEqual({}));

  it("lưu rồi đọc lại", () => {
    saveMyWords(addMyWord({}, 3, { w: "refill", m: "rót thêm" }, NOW));
    expect(myWordsFor(loadMyWords(), 3)[0].w).toBe("refill");
    expect(localStorage.getItem(MYWORDS_KEY)).toBeTruthy();
  });

  it("JSON hỏng → rỗng, không ném lỗi", () => {
    localStorage.setItem(MYWORDS_KEY, "{{{");
    expect(loadMyWords()).toEqual({});
  });
});

describe("addMyWord", () => {
  it("thêm được và KHÔNG mutate store cũ", () => {
    const s0 = {};
    const s1 = addMyWord(s0, 5, { w: "takeaway", m: "đồ mang đi", en: "I'd like a takeaway." }, NOW);
    expect(s0).toEqual({});
    expect(myWordsFor(s1, 5)).toEqual([{ w: "takeaway", m: "đồ mang đi", en: "I'd like a takeaway.", at: NOW }]);
  });

  it("từ rỗng / thiếu day → bỏ qua, trả nguyên store", () => {
    const s = { 1: [] };
    expect(addMyWord(s, 1, { w: "   " }, NOW)).toBe(s);
    expect(addMyWord(s, null, { w: "abc" }, NOW)).toBe(s);
  });

  it("trùng từ trong CÙNG ngày → cập nhật, không nhân đôi", () => {
    let s = addMyWord({}, 2, { w: "refill", m: "nghia cu" }, NOW);
    s = addMyWord(s, 2, { w: "  Refill ", m: "nghia moi", en: "cau moi" }, NOW + 5000);
    expect(myWordsFor(s, 2)).toHaveLength(1);
    expect(myWordsFor(s, 2)[0].m).toBe("nghia moi");
    expect(myWordsFor(s, 2)[0].en).toBe("cau moi");
    expect(myWordsFor(s, 2)[0].at).toBe(NOW); // giữ mốc thêm lần ĐẦU
  });

  it("cùng từ ở ngày KHÁC vẫn là hai mục riêng", () => {
    let s = addMyWord({}, 1, { w: "exit" }, NOW);
    s = addMyWord(s, 2, { w: "exit" }, NOW);
    expect(countMyWords(s)).toBe(2);
  });

  it("cắt khoảng trắng thừa của từ và nghĩa", () => {
    const s = addMyWord({}, 1, { w: "  spell  ", m: "  đánh vần " }, NOW);
    expect(myWordsFor(s, 1)[0]).toMatchObject({ w: "spell", m: "đánh vần" });
  });
});

describe("removeMyWord / countMyWords", () => {
  it("xoá đúng từ, không phân biệt hoa thường", () => {
    let s = addMyWord({}, 1, { w: "exit" }, NOW);
    s = addMyWord(s, 1, { w: "ATM" }, NOW);
    s = removeMyWord(s, 1, "EXIT");
    expect(myWordsFor(s, 1).map((x) => x.w)).toEqual(["ATM"]);
  });

  it("xoá ngày không tồn tại → trả nguyên store", () => {
    const s = { 1: [] };
    expect(removeMyWord(s, 99, "x")).toBe(s);
  });

  it("đếm trên nhiều ngày", () => {
    let s = addMyWord({}, 1, { w: "a" }, NOW);
    s = addMyWord(s, 1, { w: "b" }, NOW);
    s = addMyWord(s, 4, { w: "c" }, NOW);
    expect(countMyWords(s)).toBe(3);
    expect(countMyWords({})).toBe(0);
  });
});

describe("normWord", () => {
  it("bỏ hoa thường, gộp khoảng trắng", () => {
    expect(normWord("  Take   Away ")).toBe("take away");
    expect(normWord(null)).toBe("");
  });
});
