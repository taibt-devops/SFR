import { describe, expect, it } from "vitest";
import {
  currentCard,
  answerQueue,
  isSessionDone,
  computeStats,
  nextDueAt,
  hardCards,
  MASTERED_INTERVAL,
} from "./session.js";
import { DAY } from "./sm2.js";

const NOW = 1_700_000_000_000;

describe("hàng đợi in-memory (C3, §1.4)", () => {
  const q = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("currentCard = đầu hàng đợi; null khi rỗng", () => {
    expect(currentCard(q).id).toBe("a");
    expect(currentCard([])).toBe(null);
  });

  it("Chưa nhớ (q<3) → đẩy card về CUỐI, không loại", () => {
    const out = answerQueue(q, 2);
    expect(out.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("Khó/Tốt/Dễ (q≥3) → loại card khỏi hàng đợi", () => {
    expect(answerQueue(q, 3).map((c) => c.id)).toEqual(["b", "c"]);
    expect(answerQueue(q, 5).map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("KHÔNG mutate hàng đợi đầu vào", () => {
    const snap = JSON.stringify(q);
    answerQueue(q, 2);
    answerQueue(q, 4);
    expect(JSON.stringify(q)).toBe(snap);
  });

  it("answerQueue trên hàng đợi rỗng an toàn; isSessionDone đúng", () => {
    expect(answerQueue([], 4)).toEqual([]);
    expect(isSessionDone([])).toBe(true);
    expect(isSessionDone(q)).toBe(false);
  });
});

describe("computeStats (§1.6)", () => {
  const cards = [{ id: "n1" }, { id: "n2" }, { id: "learn" }, { id: "master" }, { id: "overdue" }];
  const states = {
    learn: { seen: true, interval: 5, due: NOW + DAY }, // đang học, chưa đến hạn
    master: { seen: true, interval: MASTERED_INTERVAL, due: NOW + 10 * DAY }, // đã thuộc
    overdue: { seen: true, interval: 8, due: NOW - DAY }, // đang học + đến hạn
  };
  const getState = (id) => states[id];

  it("phân loại mới / đang học / đã thuộc đúng ngưỡng", () => {
    const s = computeStats(cards, getState, NOW);
    expect(s.new).toBe(2); // n1, n2 chưa có state
    expect(s.learning).toBe(2); // learn, overdue (interval < 21)
    expect(s.mastered).toBe(1); // master (interval ≥ 21)
  });

  it("đến hạn = isDue === true, gồm cả thẻ mới (spec §1.6)", () => {
    const s = computeStats(cards, getState, NOW);
    // n1, n2 (mới → due) + overdue (due ≤ now) = 3; learn & master chưa đến hạn
    expect(s.due).toBe(3);
  });
});

describe("hardCards", () => {
  const cards = [{ id: "fresh" }, { id: "easy" }, { id: "lapsed2" }, { id: "lapsed1" }, { id: "loweEf" }];
  const states = {
    easy: { seen: true, lapses: 0, ef: 2.6 }, // không khó
    lapsed2: { seen: true, lapses: 2, ef: 2.0 },
    lapsed1: { seen: true, lapses: 1, ef: 2.3 },
    loweEf: { seen: true, lapses: 0, ef: 1.6 }, // ef thấp → khó
  };
  const getState = (id) => states[id];

  it("lọc thẻ khó (lapses≥1 hoặc ef≤2.0), bỏ thẻ mới & thẻ dễ", () => {
    const out = hardCards(cards, getState).map((c) => c.id);
    expect(out).not.toContain("fresh");
    expect(out).not.toContain("easy");
    expect(out).toContain("lapsed2");
    expect(out).toContain("lapsed1");
    expect(out).toContain("loweEf");
  });

  it("sắp khó nhất trước (lapses desc, rồi ef asc) và tôn trọng limit", () => {
    const out = hardCards(cards, getState, { limit: 2 }).map((c) => c.id);
    expect(out).toEqual(["lapsed2", "lapsed1"]); // lapses 2 trước, rồi lapses 1
  });
});

describe("nextDueAt", () => {
  it("trả min(due) của các thẻ đã seen", () => {
    const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const states = {
      a: { seen: true, due: NOW + 5 * DAY },
      b: { seen: true, due: NOW + 2 * DAY },
      c: { seen: false },
    };
    expect(nextDueAt(cards, (id) => states[id])).toBe(NOW + 2 * DAY);
  });

  it("null khi chưa có thẻ nào seen", () => {
    const cards = [{ id: "a" }];
    expect(nextDueAt(cards, () => undefined)).toBe(null);
  });
});
