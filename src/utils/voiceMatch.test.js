import { describe, expect, it } from "vitest";
import { matchSpoken, diffWords } from "./voiceMatch.js";

describe("matchSpoken (§5.4)", () => {
  it("khớp từ/cụm xuất hiện nguyên văn, bỏ hoa thường/dấu câu", () => {
    const said = "Well, I carry out tests and stay humble.";
    expect(matchSpoken(said, ["carry out", "humble", "stubborn"]).sort()).toEqual(["carry out", "humble"]);
  });
  it("không khớp khi chỉ trùng một phần / biến cách", () => {
    expect(matchSpoken("she carried the box", ["carry out"])).toEqual([]);
    expect(matchSpoken("", ["humble"])).toEqual([]);
  });
});

describe("diffWords (§5.5)", () => {
  it("đánh dấu từ nghe được vs trật, giữ thứ tự target", () => {
    const r = diffWords("She is reliable.", "she is liable");
    expect(r.map((x) => x.word)).toEqual(["She", "is", "reliable."]);
    expect(r.map((x) => x.ok)).toEqual([true, true, false]); // "reliable" không khớp "liable"
  });
  it("khớp hết khi đọc đúng (bỏ hoa thường/dấu câu)", () => {
    const r = diffWords("Be proactive!", "be proactive");
    expect(r.every((x) => x.ok)).toBe(true);
  });
});
