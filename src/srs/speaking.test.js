import { describe, expect, it } from "vitest";
import { addAssessment, latestLevel, cefrIndex, speakingProfile } from "./speaking.js";

const mk = (at, cefr, tags = [], dims = {}) => ({ at, cefr, tags, dims });

describe("addAssessment / latestLevel", () => {
  it("thêm mới lên đầu, giữ tối đa 100", () => {
    let list = [];
    for (let i = 0; i < 105; i++) list = addAssessment(list, mk(i, "B1"));
    expect(list.length).toBe(100);
    expect(list[0].at).toBe(104); // mới nhất đầu
  });
  it("latestLevel = bài hợp lệ gần nhất", () => {
    expect(latestLevel([mk(2, "?"), mk(1, "B2")])).toBe("B2");
    expect(latestLevel([])).toBe(null);
  });
});

describe("cefrIndex", () => {
  it("A1→1 … C2→6, sai→null", () => {
    expect(cefrIndex("A1")).toBe(1);
    expect(cefrIndex("C2")).toBe(6);
    expect(cefrIndex("?")).toBe(null);
  });
});

describe("speakingProfile", () => {
  it("null khi rỗng", () => {
    expect(speakingProfile([])).toBe(null);
  });
  it("trend cũ→mới, top tags theo tần suất, trục yếu nhất", () => {
    const list = [
      // mới nhất đầu
      mk(3, "B1", ["mạo từ", "giới từ"], { fluency: { level: "B1" }, grammar: { level: "A2" }, lexical: { level: "B1" }, pronunciation: { level: "B1" } }),
      mk(2, "A2", ["mạo từ"]),
      mk(1, "A2", ["mạo từ", "phát âm"]),
    ];
    const p = speakingProfile(list);
    expect(p.count).toBe(3);
    expect(p.currentCefr).toBe("B1");
    expect(p.trend.map((t) => t.at)).toEqual([1, 2, 3]); // cũ → mới
    expect(p.trend[2].idx).toBe(3); // B1 = 3
    expect(p.topTags[0]).toEqual({ tag: "mạo từ", count: 3 }); // hay lặp nhất
    expect(p.weakestDim).toBe("grammar"); // A2 thấp nhất trong các trục
  });
});
