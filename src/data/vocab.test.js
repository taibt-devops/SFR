import { describe, expect, it } from "vitest";
import vocab from "./vocab.js";

describe("vocab dataset (C2)", () => {
  it("nạp được mảng có thẻ", () => {
    expect(Array.isArray(vocab)).toBe(true);
    expect(vocab.length).toBeGreaterThan(0);
  });

  it("mỗi thẻ có đủ trường bắt buộc c, v, m, e, d", () => {
    for (const card of vocab) {
      for (const k of ["c", "v", "m", "e", "d"]) {
        expect(card[k], `${card.id} thiếu trường ${k}`).toBeTruthy();
      }
    }
  });

  it("id = c + '::' + v và duy nhất", () => {
    const seen = new Set();
    for (const card of vocab) {
      expect(card.id).toBe(card.c + "::" + card.v);
      expect(seen.has(card.id), `id trùng: ${card.id}`).toBe(false);
      seen.add(card.id);
    }
  });
});
