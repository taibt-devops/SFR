import { beforeEach, describe, expect, it } from "vitest";
import { loadProgress, saveProgress, resetProgress, KEY } from "./storage.js";

// Mock localStorage tối giản (chạy trong node, không cần jsdom).
function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = mockLocalStorage();
});

describe("storage", () => {
  it("save rồi load trả lại map y hệt", () => {
    const m = { "Công việc::deadline": { ef: 2.5, reps: 1, seen: true } };
    saveProgress(m);
    expect(loadProgress()).toEqual(m);
  });

  it("load khi chưa có gì → {}", () => {
    expect(loadProgress()).toEqual({});
  });

  it("load khi JSON hỏng → {} (không throw)", () => {
    globalThis.localStorage.setItem(KEY, "{json hỏng");
    expect(loadProgress()).toEqual({});
  });

  it("resetProgress() xoá tiến độ", () => {
    saveProgress({ a: 1 });
    resetProgress();
    expect(loadProgress()).toEqual({});
  });
});
