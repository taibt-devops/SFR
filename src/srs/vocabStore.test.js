import { describe, expect, it } from "vitest";
import {
  withId,
  mergeVocab,
  normalizeEntry,
  parseImport,
  classifyImport,
  upsertUser,
  exportUser,
} from "./vocabStore.js";

const builtin = [
  withId({ c: "A", v: "one", m: "m1" }),
  withId({ c: "A", v: "two", m: "m2" }),
];

describe("mergeVocab", () => {
  it("gộp built-in + user; user ĐÈ built-in khi trùng id", () => {
    const user = [{ c: "A", v: "two", m: "user-override" }, { c: "B", v: "x", m: "mx" }];
    const out = mergeVocab(builtin, user);
    expect(out).toHaveLength(3);
    expect(out.find((c) => c.id === "A::two").m).toBe("user-override");
    expect(out.find((c) => c.id === "B::x")).toBeTruthy();
  });
});

describe("normalizeEntry", () => {
  it("trim + giữ đúng 6 trường", () => {
    const n = normalizeEntry({ c: " A ", v: " w ", m: "x", extra: "bỏ" });
    expect(n).toEqual({ c: "A", v: "w", m: "x", e: "", d: "", col: "" });
    expect(n.extra).toBeUndefined();
  });
  it("trả null khi thiếu c hoặc v", () => {
    expect(normalizeEntry({ c: "A" })).toBe(null);
    expect(normalizeEntry({ v: "w" })).toBe(null);
    expect(normalizeEntry(null)).toBe(null);
  });
});

describe("parseImport", () => {
  it("JSON hỏng → ok:false", () => {
    expect(parseImport("{bad").ok).toBe(false);
  });
  it("không phải mảng → ok:false", () => {
    expect(parseImport('{"c":"A"}').ok).toBe(false);
  });
  it("phân loại valid/invalid", () => {
    const res = parseImport('[{"c":"A","v":"w"},{"c":"A"},{"v":"z"}]');
    expect(res.ok).toBe(true);
    expect(res.valid).toHaveLength(1);
    expect(res.invalid).toBe(2);
  });
});

describe("classifyImport", () => {
  it("đếm mới vs trùng theo existingIds", () => {
    const ids = new Set(["A::one"]);
    const { added, duplicate } = classifyImport(
      [{ c: "A", v: "one" }, { c: "A", v: "new" }],
      ids
    );
    expect(duplicate).toBe(1);
    expect(added).toBe(1);
  });
});

describe("upsertUser / exportUser", () => {
  it("upsert theo id (bản mới đè), trả mảng mới không mutate", () => {
    const existing = [{ c: "A", v: "one", m: "old" }];
    const out = upsertUser(existing, [{ c: "A", v: "one", m: "new" }, { c: "A", v: "two" }]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.v === "one").m).toBe("new");
    expect(existing).toHaveLength(1); // không mutate input
  });
  it("exportUser ra JSON parse lại được", () => {
    const list = [{ c: "A", v: "one" }];
    expect(JSON.parse(exportUser(list))).toEqual(list);
  });
});
