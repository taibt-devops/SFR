import { describe, expect, it } from "vitest";
import { speechStats } from "./fluency.js";

describe("speechStats", () => {
  it("đếm từ, tính WPM, đếm filler", () => {
    const s = speechStats("Um, I think it is, you know, basically good.", 6);
    expect(s.words).toBe(9); // Um, I think it is, you know, basically good.
    expect(s.seconds).toBe(6);
    expect(s.wpm).toBe(90); // 9 từ / (6/60) = 90
    expect(s.fillers).toBe(3); // um · you know · basically
  });
  it("an toàn khi rỗng / 0 giây", () => {
    expect(speechStats("", 0)).toEqual({ words: 0, seconds: 0, wpm: 0, fillers: 0 });
  });
});
