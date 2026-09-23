import { beforeEach, describe, expect, it } from "vitest";
import { loadAsk, saveAsk, addAsk, recentAsks, sanitizeAnswer, normVi, ASK_KEY, MAX_ASKS } from "./ask.js";

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
const NOW = 1_700_000_000_000;
const A = { en: "Could I get the bill?", ipa: "/kʊd aɪ ɡet ðə bɪl/", use: "Lịch sự.", say: "", alt: null };

beforeEach(() => {
  globalThis.localStorage = mockLocalStorage();
});

describe("load / save", () => {
  it("chưa có gì → mảng rỗng", () => expect(loadAsk()).toEqual([]));

  it("lưu rồi đọc lại", () => {
    saveAsk(addAsk([], "cho tôi xin hoá đơn", A, NOW));
    expect(loadAsk()[0].vi).toBe("cho tôi xin hoá đơn");
    expect(localStorage.getItem(ASK_KEY)).toBeTruthy();
  });

  it("JSON hỏng → rỗng, không ném lỗi", () => {
    localStorage.setItem(ASK_KEY, "{{{");
    expect(loadAsk()).toEqual([]);
  });

  it("localStorage lưu một object (không phải mảng) → rỗng", () => {
    localStorage.setItem(ASK_KEY, '{"a":1}');
    expect(loadAsk()).toEqual([]);
  });
});

describe("addAsk", () => {
  it("câu mới đứng ĐẦU", () => {
    const s1 = addAsk([], "câu một", A, NOW);
    const s2 = addAsk(s1, "câu hai", A, NOW + 1);
    expect(s2.map((x) => x.vi)).toEqual(["câu hai", "câu một"]);
  });

  it("KHÔNG mutate tham số", () => {
    const s0 = addAsk([], "câu một", A, NOW);
    const before = JSON.stringify(s0);
    addAsk(s0, "câu hai", A, NOW + 1);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it("lưu kèm câu trả lời và mốc thời gian", () => {
    expect(addAsk([], "xin chào", A, NOW)[0]).toEqual({ vi: "xin chào", a: A, at: NOW });
  });

  it("hỏi lại câu cũ → đẩy lên đầu, KHÔNG nhân đôi", () => {
    let s = addAsk([], "câu một", A, NOW);
    s = addAsk(s, "câu hai", A, NOW + 1);
    s = addAsk(s, "  CÂU   Một  ", A, NOW + 2); // khác hoa thường + khoảng trắng
    expect(s).toHaveLength(2);
    // Giữ cách viết MỚI NHẤT (chỉ gộp khoảng trắng), không giữ bản cũ.
    expect(s[0].vi).toBe("CÂU Một");
    expect(s[0].at).toBe(NOW + 2);
  });

  it("câu rỗng → trả store cũ nguyên vẹn", () => {
    const s = addAsk([], "câu một", A, NOW);
    expect(addAsk(s, "   ", A, NOW)).toBe(s);
  });

  it("store không phải mảng → vẫn trả mảng", () => {
    expect(addAsk(null, "câu một", A, NOW)).toHaveLength(1);
  });

  it("giữ tối đa " + MAX_ASKS + " câu, cắt câu cũ nhất", () => {
    let s = [];
    for (let i = 0; i < MAX_ASKS + 5; i++) s = addAsk(s, "câu " + i, A, NOW + i);
    expect(s).toHaveLength(MAX_ASKS);
    expect(s[0].vi).toBe("câu " + (MAX_ASKS + 4));
    expect(s.some((x) => x.vi === "câu 0")).toBe(false);
  });
});

describe("recentAsks", () => {
  it("lấy n câu đầu", () => {
    let s = [];
    for (let i = 0; i < 6; i++) s = addAsk(s, "câu " + i, A, NOW + i);
    expect(recentAsks(s, 3).map((x) => x.vi)).toEqual(["câu 5", "câu 4", "câu 3"]);
  });

  it("store hỏng → rỗng", () => expect(recentAsks(null, 3)).toEqual([]));
});

describe("normVi", () => {
  it("bỏ hoa thường, gộp khoảng trắng", () => expect(normVi("  Cho  TÔI xin ")).toBe("cho tôi xin"));
});

describe("sanitizeAnswer", () => {
  const full = {
    en: "  Could I get the bill?  ",
    ipa: "/kʊd aɪ ɡet ðə bɪl/",
    use: "Lịch sự.",
    say: "",
    alt: { en: "Check, please.", ipa: "/tʃek pliːz/", note: "thân mật" },
  };

  it("ép kiểu và cắt khoảng trắng", () => {
    expect(sanitizeAnswer(full)).toEqual({
      en: "Could I get the bill?",
      ipa: "/kʊd aɪ ɡet ðə bɪl/",
      use: "Lịch sự.",
      say: "",
      alt: { en: "Check, please.", ipa: "/tʃek pliːz/", note: "thân mật" },
    });
  });

  it("thiếu en → null (không có gì để hiện)", () => {
    expect(sanitizeAnswer({ ipa: "/x/", use: "abc" })).toBeNull();
    expect(sanitizeAnswer({ en: "   " })).toBeNull();
  });

  it("không phải object → null", () => {
    expect(sanitizeAnswer(null)).toBeNull();
    expect(sanitizeAnswer("Could I get the bill?")).toBeNull();
    expect(sanitizeAnswer([{ en: "x" }])).toBeNull();
  });

  it("trường thiếu → chuỗi rỗng, không phải undefined", () => {
    expect(sanitizeAnswer({ en: "Hi." })).toEqual({ en: "Hi.", ipa: "", use: "", say: "", alt: null });
  });

  it("trường là số / object → chuỗi rỗng", () => {
    const r = sanitizeAnswer({ en: "Hi.", ipa: 42, use: { a: 1 }, say: ["x"] });
    expect(r).toEqual({ en: "Hi.", ipa: "", use: "", say: "", alt: null });
  });

  it("alt là mảng / chuỗi / thiếu en → alt = null", () => {
    expect(sanitizeAnswer({ en: "Hi.", alt: ["Hey."] }).alt).toBeNull();
    expect(sanitizeAnswer({ en: "Hi.", alt: "Hey." }).alt).toBeNull();
    expect(sanitizeAnswer({ en: "Hi.", alt: { ipa: "/heɪ/" } }).alt).toBeNull();
  });

  it("alt chỉ có en → ipa/note rỗng", () => {
    expect(sanitizeAnswer({ en: "Hi.", alt: { en: "Hey." } }).alt).toEqual({ en: "Hey.", ipa: "", note: "" });
  });

  it("KHÔNG mutate tham số", () => {
    const before = JSON.stringify(full);
    sanitizeAnswer(full);
    expect(JSON.stringify(full)).toBe(before);
  });
});

describe("addAsk + sanitizeAnswer", () => {
  it("câu trả lời không dùng được → trả store cũ nguyên vẹn", () => {
    const s = addAsk([], "câu một", { en: "Hi." }, NOW);
    expect(addAsk(s, "câu hai", { ipa: "/x/" }, NOW + 1)).toBe(s);
    expect(addAsk(s, "câu hai", null, NOW + 1)).toBe(s);
  });

  it("lưu bản ĐÃ làm sạch, không lưu bản thô", () => {
    const s = addAsk([], "câu một", { en: " Hi. ", ipa: 9 }, NOW);
    expect(s[0].a).toEqual({ en: "Hi.", ipa: "", use: "", say: "", alt: null });
  });
});
