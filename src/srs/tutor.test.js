import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
  weeklyReport,
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

  it("ERROR_TAGS khớp THẬT với bảng nhãn trong server/proxy.mjs#handleAssess (đọc file, không chép tay)", () => {
    // Đọc thẳng server/proxy.mjs thay vì so hai chuỗi hardcode — nếu ai sửa nhãn ở MỘT trong hai
    // file mà quên sửa file kia, test này phải ĐỎ (trước đây chỉ kiểm 2 chuỗi cứng + độ dài 9,
    // nên lệch bảng nhãn vẫn xanh — đúng chỗ hậu quả nặng nhất lại không có gác).
    const proxyPath = fileURLToPath(new URL("../../server/proxy.mjs", import.meta.url));
    const src = readFileSync(proxyPath, "utf8");

    // Mốc "danh sách:" nằm ngay trước chuỗi liệt kê nhãn trong system prompt của handleAssess.
    const anchor = "danh sách:";
    const anchorIdx = src.indexOf(anchor);
    expect(anchorIdx, "khong tim thay moc 'danh sach:' trong proxy.mjs — handleAssess co the da doi cau chu").not.toBe(-1);

    // Chuỗi liệt kê nhãn nằm trong literal single-quote KẾ TIẾP, bắt đầu ngay bằng dấu ".
    const after = src.slice(anchorIdx, anchorIdx + 600);
    const literal = after.match(/'("[^']*)'/);
    expect(literal, "khong tim thay chuoi literal chua danh sach nhan ngay sau moc").toBeTruthy();

    const tagsInProxy = [...literal[1].matchAll(/"([^"]+)"/g)].map((m) => m[1].normalize("NFC"));
    expect(tagsInProxy.length).toBeGreaterThan(0);

    // Chuẩn hoá NFC cả hai phía — bắt được cả trường hợp lệch TỔ HỢP DẤU Unicode (NFC/NFD),
    // không chỉ lệch chữ cái thường thấy.
    expect(ERROR_TAGS.map((t) => t.normalize("NFC"))).toEqual(tagsInProxy);
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

  it("store null → không ném lỗi, trả mảng rỗng (nhất quán với focusFor/drillsFor/hintFor/clearHint)", () => {
    expect(topErrors(null, [], 5)).toEqual([]);
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

describe("hintFor / clearHint", () => {
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

describe("weeklyReport", () => {
  const store = {
    // tuần 1 = ngày 1..6, tuần 2 = ngày 7..12
    1: mkDay(["mạo từ", "giới từ"]),
    2: mkDay(["mạo từ"]),
    7: mkDay(["mạo từ"]),
    8: mkDay(["trật tự từ"]),
  };

  it("so tuần này với tuần trước: giảm / mới / hết", () => {
    const r = weeklyReport(store, 2);
    expect(r.fixed).toEqual(["giới từ"]);          // tuần 1 có, tuần 2 hết
    expect(r.improved).toEqual([{ tag: "mạo từ", before: 2, after: 1 }]);
    expect(r.appeared).toEqual(["trật tự từ"]);    // tuần 2 mới xuất hiện
  });

  it("tuần 1 (không có tuần trước) → mọi lỗi đều là 'mới', không có 'hết'", () => {
    const r = weeklyReport(store, 1);
    expect(r.fixed).toEqual([]);
    expect(r.appeared.sort()).toEqual(["giới từ", "mạo từ"]);
  });

  it("tuần không có dữ liệu → mọi mảng rỗng", () => {
    expect(weeklyReport({}, 3)).toEqual({ fixed: [], improved: [], appeared: [], worse: [] });
  });

  it("lỗi tăng lên thì vào 'worse'", () => {
    const s = { 1: mkDay(["giới từ"]), 7: mkDay(["giới từ"]), 8: mkDay(["giới từ"]) };
    expect(weeklyReport(s, 2).worse).toEqual([{ tag: "giới từ", before: 1, after: 2 }]);
  });
});
