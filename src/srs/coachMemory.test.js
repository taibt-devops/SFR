import { describe, expect, it } from "vitest";
import { addCoachNote, latestNote, priorFocusText } from "./coachMemory.js";

const note = (i) => ({ at: i, topic: "t", level: "B1", wentWell: [], toImprove: ["giới từ", "thì quá khứ"], suggestion: "s" + i });

describe("coachMemory", () => {
  it("addCoachNote prepend + cap 20, mới nhất lên đầu", () => {
    let list = [];
    for (let i = 0; i < 25; i++) list = addCoachNote(list, note(i));
    expect(list.length).toBe(20);
    expect(list[0].at).toBe(24); // mới nhất
    expect(latestNote(list).suggestion).toBe("s24");
  });

  it("latestNote rỗng → null", () => {
    expect(latestNote([])).toBe(null);
    expect(latestNote()).toBe(null);
  });

  it("priorFocusText gộp tối đa 2 điểm của buổi gần nhất", () => {
    expect(priorFocusText([note(1)])).toBe("giới từ; thì quá khứ");
    expect(priorFocusText([])).toBe("");
    expect(priorFocusText([{ at: 1, toImprove: [] }])).toBe("");
  });
});
