import { describe, expect, it } from "vitest";
import {
  makeCloze,
  checkAnswer,
  normalize,
  suggestedQ,
  availableTypes,
  pickType,
  pickAdaptiveType,
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

  it("pickAdaptiveType theo độ thuộc: mới→nhận diện, đang học→cloze, đã cứng→sản xuất", () => {
    // thẻ mới (không state) hoặc vừa quên (reps 0) → recall/listen
    expect(["recall", "listen"]).toContain(pickAdaptiveType(card, undefined, 0));
    expect(["recall", "listen"]).toContain(pickAdaptiveType(card, { seen: true, reps: 0 }, 1));
    // đang học (reps 1–2) → cloze/recall
    expect(["cloze", "recall"]).toContain(pickAdaptiveType(card, { seen: true, reps: 2 }, 0));
    // đã cứng (reps ≥ 3) → produce/reverse
    expect(["produce", "reverse"]).toContain(pickAdaptiveType(card, { seen: true, reps: 4 }, 0));
  });

  it("pickAdaptiveType fallback khi tầng không có kiểu hợp lệ (thiếu cloze/d)", () => {
    const plain = { v: "reliable", e: "I rely on her." }; // không cloze, không d
    // đang học: tầng [cloze, recall] → chỉ recall hợp lệ
    expect(pickAdaptiveType(plain, { seen: true, reps: 2 }, 0)).toBe("recall");
    // đã cứng: tầng [produce, reverse] → thiếu d nên chỉ produce
    expect(pickAdaptiveType(plain, { seen: true, reps: 5 }, 0)).toBe("produce");
  });

  it("pickAdaptiveType tất định theo seed", () => {
    const a = pickAdaptiveType(card, { seen: true, reps: 4 }, 3);
    const b = pickAdaptiveType(card, { seen: true, reps: 4 }, 3);
    expect(a).toBe(b);
  });

  it("isAutoGraded: cloze & listen auto, còn lại thủ công", () => {
    expect(isAutoGraded("cloze")).toBe(true);
    expect(isAutoGraded("listen")).toBe(true);
    expect(isAutoGraded("recall")).toBe(false);
    expect(isAutoGraded("produce")).toBe(false);
  });
});
