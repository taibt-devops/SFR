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

describe("diffWords — từ có dấu gạch nối", () => {
  // Whisper KHÔNG xuất dấu gạch nối. Người học nói đúng hoàn toàn "I've been binge-watching
  // movies." thì Whisper trả "I've been binge watching movies." — bản cũ chấm "binge-watching"
  // là SAI, tô đỏ, và báo "Gần đúng". Thấy trên máy người dùng thật.
  it("nói đúng câu có từ gạch nối → KHÔNG bị chấm sai", () => {
    const r = diffWords("I've been binge-watching movies.", "I've been binge watching movies.");
    expect(r.map((x) => x.ok)).toEqual([true, true, true, true]);
  });

  it("giữ nguyên dấu gạch nối để HIỂN THỊ, chỉ nới lỏng lúc so", () => {
    const r = diffWords("Could you double-check the booking?", "Could you double check the booking");
    expect(r.find((x) => x.word.startsWith("double")).word).toBe("double-check");
    expect(r.every((x) => x.ok)).toBe(true);
  });

  it("chiều ngược lại: đích rời, nghe được lại dính gạch nối", () => {
    const r = diffWords("I like sci fi movies", "I like sci-fi movies");
    expect(r.every((x) => x.ok)).toBe(true);
  });

  it("THIẾU hẳn một nửa của từ ghép thì vẫn phải báo sai", () => {
    const r = diffWords("I've been binge-watching movies.", "I've been watching movies.");
    expect(r.find((x) => x.word === "binge-watching").ok).toBe(false);
  });

  it("nói sai từ khác thì vẫn bắt được như cũ", () => {
    const r = diffWords("double-check the booking", "double check the flight");
    expect(r.map((x) => x.ok)).toEqual([true, true, false]);
  });
});
