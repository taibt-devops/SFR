import { beforeEach, describe, expect, it } from "vitest";
import { addAttempt, attemptsFor, loadTutor, saveTutor, TUTOR_KEY } from "./tutor.js";

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
