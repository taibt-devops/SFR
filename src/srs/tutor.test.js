import { beforeEach, describe, expect, it } from "vitest";
import {
  addAttempt,
  analysisFor,
  attemptsFor,
  clearHint,
  drillsFor,
  ERROR_TAGS,
  focusFor,
  hintFor,
  loadTutor,
  sanitizeAnalysis,
  saveTutor,
  setAnalysis,
  topErrors,
  TUTOR_KEY,
} from "./tutor.js";

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
const NOW = 1_700_000_000_000;
const A = { kind: "drill", target: "I'd like a tea.", heard: "I like a tea", score: 0.8 };

beforeEach(() => { globalThis.localStorage = mockLocalStorage(); });

describe("addAttempt", () => {
  it("thêm được và KHÔNG mutate store cũ", () => {
    const s0 = {};
    const s1 = addAttempt(s0, 3, A, NOW);
    expect(s0).toEqual({});
    expect(attemptsFor(s1, 3)).toHaveLength(1);
    expect(attemptsFor(s1, 3)[0]).toMatchObject({ ...A, at: NOW });
  });

  it("thiếu target hoặc thiếu day → bỏ qua, trả nguyên store", () => {
    const s = { 3: { attempts: [] } };
    expect(addAttempt(s, 3, { kind: "drill", heard: "x" }, NOW)).toBe(s);
    expect(addAttempt(s, null, A, NOW)).toBe(s);
  });

  it("giữ tối đa 40 attempt mỗi ngày, bỏ cái CŨ nhất", () => {
    let s = {};
    for (let i = 0; i < 45; i++) s = addAttempt(s, 1, { ...A, target: "t" + i }, NOW + i);
    const list = attemptsFor(s, 1);
    expect(list).toHaveLength(40);
    expect(list[0].target).toBe("t5");
  });

  it("load/save vòng tròn", () => {
    saveTutor(addAttempt({}, 2, A, NOW));
    expect(attemptsFor(loadTutor(), 2)).toHaveLength(1);
    expect(localStorage.getItem(TUTOR_KEY)).toBeTruthy();
  });

  it("JSON hỏng → object rỗng, không ném lỗi", () => {
    localStorage.setItem(TUTOR_KEY, "{{{");
    expect(loadTutor()).toEqual({});
  });
});

describe("sanitizeAnalysis", () => {
  it("giữ nhãn hợp lệ, BỎ nhãn lạ", () => {
    const out = sanitizeAnalysis({
      errors: [
        { tag: "mạo từ", vi: "thiếu a/an", evidence: "I like tea", fix: "I'd like a tea" },
        { tag: "article", vi: "x", evidence: "y", fix: "z" },
      ],
    });
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].tag).toBe("mạo từ");
  });

  it("bỏ drill thiếu vi hoặc en, giữ tối đa 2", () => {
    const out = sanitizeAnalysis({
      drills: [{ vi: "a", en: "A" }, { vi: "b" }, { vi: "c", en: "C" }, { vi: "d", en: "D" }],
    });
    expect(out.drills).toEqual([{ vi: "a", en: "A" }, { vi: "c", en: "C" }]);
  });

  it("chỉ nhận q trong 2..5, bỏ hint thiếu itemId", () => {
    const out = sanitizeAnalysis({
      hints: [
        { itemId: "pat::1", q: 4, why: "ok" },
        { itemId: "pat::2", q: 9, why: "x" },
        { q: 3, why: "thieu id" },
      ],
    });
    expect(out.hints).toEqual([{ itemId: "pat::1", q: 4, why: "ok" }]);
  });

  it("đầu vào không phải object → null", () => {
    expect(sanitizeAnalysis(null)).toBeNull();
    expect(sanitizeAnalysis("chuoi")).toBeNull();
  });

  it("gói rỗng vẫn hợp lệ, các mảng thành rỗng", () => {
    expect(sanitizeAnalysis({})).toEqual({ errors: [], strengths: [], focus: "", drills: [], hints: [] });
  });

  it("ERROR_TAGS khớp bảng của /assess", () => {
    expect(ERROR_TAGS).toContain("mạo từ");
    expect(ERROR_TAGS).toContain("ngập ngừng-trôi chảy");
    expect(ERROR_TAGS).toHaveLength(9);
  });

  it("setAnalysis lưu gói đã lọc, không mutate", () => {
    const s0 = {};
    const s1 = setAnalysis(s0, 3, { focus: "mạo từ", errors: [{ tag: "lạ" }] }, 1);
    expect(s0).toEqual({});
    expect(analysisFor(s1, 3).focus).toBe("mạo từ");
    expect(analysisFor(s1, 3).errors).toEqual([]);
  });

  it("setAnalysis với gói hỏng → lưu null, không ném lỗi", () => {
    const s = setAnalysis({}, 3, "rac", 1);
    expect(analysisFor(s, 3)).toBeNull();
  });
});

const mkDay = (tags, extra = {}) => ({
  attempts: [],
  analysis: { errors: tags.map((t) => ({ tag: t, vi: "", evidence: "", fix: "" })),
              strengths: [], focus: "", drills: [], hints: [], ...extra },
});

describe("topErrors", () => {
  it("đếm gộp qua nhiều ngày, nhiều nhất lên đầu", () => {
    const store = { 1: mkDay(["mạo từ", "giới từ"]), 2: mkDay(["mạo từ"]), 3: mkDay(["mạo từ", "giới từ"]) };
    expect(topErrors(store, [], 2)).toEqual([
      { tag: "mạo từ", count: 3 },
      { tag: "giới từ", count: 2 },
    ]);
  });

  it("gộp cả tags từ chấm CEFR (speaking.js) vì dùng chung bảng nhãn", () => {
    const store = { 1: mkDay(["mạo từ"]) };
    const speaking = [{ tags: ["mạo từ", "phát âm"] }];
    expect(topErrors(store, speaking, 3)).toEqual([
      { tag: "mạo từ", count: 2 },
      { tag: "phát âm", count: 1 },
    ]);
  });

  it("chưa có gì → mảng rỗng", () => {
    expect(topErrors({}, [], 3)).toEqual([]);
  });
});

describe("focusFor / drillsFor", () => {
  it("focus lấy của NGÀY LỚN NHẤT có phân tích", () => {
    const store = { 1: mkDay([], { focus: "cũ" }), 4: mkDay([], { focus: "mới" }) };
    expect(focusFor(store)).toBe("mới");
    expect(focusFor({})).toBe("");
  });

  it("drillsFor(day) lấy drill sinh từ ngày TRƯỚC đó, không phải ngày hiện tại", () => {
    const store = {
      3: mkDay([], { drills: [{ vi: "a", en: "A" }] }),
      4: mkDay([], { drills: [{ vi: "b", en: "B" }] }),
    };
    expect(drillsFor(store, 4)).toEqual([{ vi: "a", en: "A" }]);
    expect(drillsFor(store, 1)).toEqual([]);
  });
});

describe("hintFor / useHint", () => {
  it("tìm được gợi ý theo itemId", () => {
    const store = { 2: mkDay([], { hints: [{ itemId: "pat::1", q: 2, why: "vấp mạo từ" }] }) };
    expect(hintFor(store, "pat::1")).toMatchObject({ q: 2, why: "vấp mạo từ" });
    expect(hintFor(store, "pat::99")).toBeNull();
  });

  it("clearHint xoá gợi ý sau khi dùng — chỉ nhắc MỘT lần", () => {
    const store = { 2: mkDay([], { hints: [{ itemId: "pat::1", q: 2, why: "x" }] }) };
    const next = clearHint(store, "pat::1");
    expect(hintFor(next, "pat::1")).toBeNull();
  });

  it("clearHint với id không tồn tại → trả nguyên store", () => {
    const store = { 2: mkDay([], { hints: [] }) };
    expect(clearHint(store, "pat::9")).toBe(store);
  });
});
