import { describe, expect, it } from "vitest";
import {
  makeCloze,
  checkAnswer,
  normalize,
  suggestedQ,
  availableTypes,
  pickType,
  isAutoGraded,
} from "./cardTypes.js";

const card = {
  c: "Công việc",
  v: "carry out",
  m: "(phr) tiến hành",
  e: "We need to carry out more tests before the launch.",
  d: "Chúng ta cần tiến hành thêm vài bài kiểm tra trước khi ra mắt.",
  col: "carry out a test",
};

describe("makeCloze", () => {
  it("khoét token v (kể cả cụm nhiều từ) thành ____", () => {
    const cl = makeCloze(card);
    expect(cl.text).toBe("We need to ____ more tests before the launch.");
    expect(cl.answer.toLowerCase()).toBe("carry out");
  });

  it("case-insensitive: v thường, e viết hoa đầu câu", () => {
    const cl = makeCloze({ v: "reliable", e: "Reliable people keep promises." });
    expect(cl.text).toBe("____ people keep promises.");
    expect(cl.answer).toBe("Reliable");
  });

  it("fallback (null) khi v KHÔNG xuất hiện nguyên dạng trong e (biến cách)", () => {
    expect(makeCloze({ v: "reliable", e: "I rely on her." })).toBe(null);
    expect(makeCloze({ v: "x", e: "" })).toBe(null);
    expect(makeCloze({})).toBe(null);
  });
});

describe("checkAnswer / normalize", () => {
  it("bỏ qua hoa thường + khoảng trắng thừa", () => {
    expect(checkAnswer("  Carry   Out ", "carry out")).toBe(true);
    expect(normalize("  A  B ")).toBe("a b");
  });
  it("sai khi khác hoặc rỗng", () => {
    expect(checkAnswer("carry", "carry out")).toBe(false);
    expect(checkAnswer("", "carry out")).toBe(false);
  });
});

describe("suggestedQ", () => {
  it("sai → 2 (Chưa nhớ); đúng → null (người học chọn)", () => {
    expect(suggestedQ(false)).toBe(2);
    expect(suggestedQ(true)).toBe(null);
  });
});

describe("availableTypes / pickType", () => {
  it("đủ kiểu khi thẻ có d và cloze sinh được", () => {
    const t = availableTypes(card);
    expect(t).toContain("cloze");
    expect(t).toContain("reverse");
    expect(t).toContain("recall");
  });

  it("loại cloze khi không sinh được, loại reverse khi thiếu d", () => {
    const t = availableTypes({ v: "reliable", e: "I rely on her." }); // cloze null, không d
    expect(t).not.toContain("cloze");
    expect(t).not.toContain("reverse");
    expect(t).toEqual(["recall", "produce", "listen"]);
  });

  it("pickType tất định theo seed, luôn nằm trong availableTypes", () => {
    const t = availableTypes(card);
    expect(pickType(card, 0)).toBe(t[0]);
    expect(pickType(card, t.length)).toBe(t[0]); // cuộn vòng
    expect(t).toContain(pickType(card, 99));
  });

  it("isAutoGraded: cloze & listen auto, còn lại thủ công", () => {
    expect(isAutoGraded("cloze")).toBe(true);
    expect(isAutoGraded("listen")).toBe(true);
    expect(isAutoGraded("recall")).toBe(false);
    expect(isAutoGraded("produce")).toBe(false);
  });
});
