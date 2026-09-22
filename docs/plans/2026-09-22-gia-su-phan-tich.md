# Gia sư: hồ sơ năng lực & phân tích cuối buổi — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sau mỗi buổi học, gửi toàn bộ câu người học đã nói cho Claude một lần, rút ra lỗi lặp + 2 câu sửa lỗi + điểm cần chú ý, rồi dùng chúng ở buổi hôm sau.

**Architecture:** Thu thập `attempt` trong buổi → đóng ngày thì gọi `/tutor` **chạy nền** → lưu vào `srf-tutor-v1` → buổi hôm sau đọc ra để (a) chèn 2 câu sửa lỗi vào đầu nhịp 4, (b) làm nổi mức gợi ý ở nhịp ôn, (c) lái trò chuyện. Ngày chốt tuần hiện báo cáo so với tuần trước. Hỏng ở bất kỳ khâu nào → buổi học chạy như chưa có gia sư.

**Tech Stack:** Vite + React (JS), Vitest, Node thuần cho proxy, localStorage. Không thêm dependency.

**Spec:** `Lo_trinh_Spaced_Repetition_Flashcard.md` Phần 10.

---

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `src/srs/tutor.js` (tạo) | THUẦN: kho `srf-tutor-v1`, gom attempt, lọc gói phân tích, suy ra hồ sơ |
| `src/srs/tutor.test.js` (tạo) | Test cho toàn bộ `tutor.js` |
| `src/ai/tutor.js` (tạo) | Client gọi proxy `/tutor` |
| `server/proxy.mjs` (sửa) | Thêm `handleTutor` + đăng ký route |
| `src/hooks/useLesson.js` (sửa) | Ghi attempt; kích hoạt phân tích nền khi đóng ngày |
| `src/components/SpeakCheck.jsx` (sửa) | Báo attempt ra ngoài qua callback |
| `src/components/StepSpeak.jsx` (sửa) | Chèn 2 câu sửa lỗi vào đầu danh sách drill |
| `src/components/StepReview.jsx` (sửa) | Làm nổi mức gợi ý + hiện lý do |
| `src/components/WeekReport.jsx` (tạo) | Báo cáo tuần, hiện ở ngày chốt tuần |
| `src/App.jsx` (sửa) | Nối `WeekReport` vào ngày chốt tuần; truyền focus vào `Call` |

**Bảng nhãn lỗi dùng chung** với `/assess` (spec §10.4) — KHÔNG đặt bảng mới:
`mạo từ` · `chia động từ/thì` · `số ít-số nhiều` · `giới từ` · `trật tự từ` · `từ vựng hạn chế` ·
`liên kết-mạch lạc` · `phát âm` · `ngập ngừng-trôi chảy`

---

## Task 1: `srs/tutor.js` — kho + gom attempt

**Files:**
- Create: `src/srs/tutor.js`
- Test: `src/srs/tutor.test.js`

- [ ] **Step 1: Viết test thất bại**

```js
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
```

- [ ] **Step 2: Chạy test cho chắc là ĐỎ**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: FAIL — `Failed to resolve import "./tutor.js"`

- [ ] **Step 3: Viết bản cài đặt tối thiểu**

```js
// Hồ sơ gia sư: attempt trong buổi + gói phân tích cuối buổi (spec §10).
// THUẦN trừ load/save; nhận `now` từ ngoài để test tất định.
export const TUTOR_KEY = "srf-tutor-v1";

const MAX_ATTEMPTS = 40; // đủ cho 1 buổi (ôn 8 + drill 5 + khó 2 + từ 6); chặn phình localStorage

export function loadTutor() {
  try {
    return JSON.parse(localStorage.getItem(TUTOR_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveTutor(store) {
  try {
    localStorage.setItem(TUTOR_KEY, JSON.stringify(store));
  } catch {
    /* localStorage không khả dụng — bỏ qua, buổi học vẫn chạy */
  }
}

export function attemptsFor(store, day) {
  return store?.[day]?.attempts || [];
}

// Ghi một lần người học nói xong. Trả store MỚI, KHÔNG mutate.
export function addAttempt(store, day, attempt, now = Date.now()) {
  if (!day || !attempt?.target) return store;
  const prev = store?.[day] || { attempts: [] };
  const list = [...(prev.attempts || []), { ...attempt, at: now }].slice(-MAX_ATTEMPTS);
  return { ...store, [day]: { ...prev, attempts: list } };
}
```

- [ ] **Step 4: Chạy test cho chắc là XANH**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: PASS — 5 test

- [ ] **Step 5: Commit**

```bash
git add src/srs/tutor.js src/srs/tutor.test.js
git commit -m "feat: srs/tutor.js - kho ho so gia su + gom attempt (Phan 10)"
```

---

## Task 2: Lọc gói phân tích

Claude có thể trả JSON thiếu trường, nhãn lạ, hoặc drill thiếu `vi`/`en`. Lọc ở MỘT chỗ để phần còn lại không phải phòng thủ (spec §10.8).

**Files:**
- Modify: `src/srs/tutor.js`
- Test: `src/srs/tutor.test.js`

- [ ] **Step 1: Viết test thất bại**

```js
import { ERROR_TAGS, sanitizeAnalysis, setAnalysis, analysisFor } from "./tutor.js";

describe("sanitizeAnalysis", () => {
  it("giữ nhãn hợp lệ, BỎ nhãn lạ", () => {
    const out = sanitizeAnalysis({
      errors: [
        { tag: "mạo từ", vi: "thiếu a/an", evidence: "I like tea", fix: "I'd like a tea" },
        { tag: "article", vi: "x", evidence: "y", fix: "z" },
      ],
    });
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].tag).toBe("mạo từ");
  });

  it("bỏ drill thiếu vi hoặc en, giữ tối đa 2", () => {
    const out = sanitizeAnalysis({
      drills: [{ vi: "a", en: "A" }, { vi: "b" }, { vi: "c", en: "C" }, { vi: "d", en: "D" }],
    });
    expect(out.drills).toEqual([{ vi: "a", en: "A" }, { vi: "c", en: "C" }]);
  });

  it("chỉ nhận q trong 2..5, bỏ hint thiếu itemId", () => {
    const out = sanitizeAnalysis({
      hints: [
        { itemId: "pat::1", q: 4, why: "ok" },
        { itemId: "pat::2", q: 9, why: "x" },
        { q: 3, why: "thieu id" },
      ],
    });
    expect(out.hints).toEqual([{ itemId: "pat::1", q: 4, why: "ok" }]);
  });

  it("đầu vào không phải object → null", () => {
    expect(sanitizeAnalysis(null)).toBeNull();
    expect(sanitizeAnalysis("chuoi")).toBeNull();
  });

  it("gói rỗng vẫn hợp lệ, các mảng thành rỗng", () => {
    expect(sanitizeAnalysis({})).toEqual({ errors: [], strengths: [], focus: "", drills: [], hints: [] });
  });

  it("ERROR_TAGS khớp bảng của /assess", () => {
    expect(ERROR_TAGS).toContain("mạo từ");
    expect(ERROR_TAGS).toContain("ngập ngừng-trôi chảy");
    expect(ERROR_TAGS).toHaveLength(9);
  });

  it("setAnalysis lưu gói đã lọc, không mutate", () => {
    const s0 = {};
    const s1 = setAnalysis(s0, 3, { focus: "mạo từ", errors: [{ tag: "lạ" }] }, 1);
    expect(s0).toEqual({});
    expect(analysisFor(s1, 3).focus).toBe("mạo từ");
    expect(analysisFor(s1, 3).errors).toEqual([]);
  });

  it("setAnalysis với gói hỏng → lưu null, không ném lỗi", () => {
    const s = setAnalysis({}, 3, "rac", 1);
    expect(analysisFor(s, 3)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là ĐỎ**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: FAIL — `sanitizeAnalysis is not a function`

- [ ] **Step 3: Viết bản cài đặt tối thiểu**

Thêm vào `src/srs/tutor.js`:

```js
// Bảng nhãn lỗi — DÙNG LẠI đúng bảng của server/proxy.mjs#handleAssess.
// Đặt bảng mới sẽ chẻ đôi hồ sơ: cùng lỗi mạo từ mà hai nguồn đếm vào hai khoá khác nhau.
export const ERROR_TAGS = [
  "mạo từ",
  "chia động từ/thì",
  "số ít-số nhiều",
  "giới từ",
  "trật tự từ",
  "từ vựng hạn chế",
  "liên kết-mạch lạc",
  "phát âm",
  "ngập ngừng-trôi chảy",
];

const str = (v) => (typeof v === "string" ? v.trim() : "");

// Lọc gói Claude trả về. Sai khuôn → null; sai từng phần → bỏ phần đó, giữ phần còn lại.
export function sanitizeAnalysis(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const errors = (Array.isArray(raw.errors) ? raw.errors : [])
    .filter((e) => e && ERROR_TAGS.includes(e.tag))
    .map((e) => ({ tag: e.tag, vi: str(e.vi), evidence: str(e.evidence), fix: str(e.fix) }));
  const drills = (Array.isArray(raw.drills) ? raw.drills : [])
    .filter((d) => d && str(d.vi) && str(d.en))
    .map((d) => ({ vi: str(d.vi), en: str(d.en) }))
    .slice(0, 2);
  const hints = (Array.isArray(raw.hints) ? raw.hints : [])
    .filter((h) => h && str(h.itemId) && Number.isInteger(h.q) && h.q >= 2 && h.q <= 5)
    .map((h) => ({ itemId: str(h.itemId), q: h.q, why: str(h.why) }));
  const strengths = (Array.isArray(raw.strengths) ? raw.strengths : []).map(str).filter(Boolean);
  return { errors, strengths, focus: str(raw.focus), drills, hints };
}

export function analysisFor(store, day) {
  return store?.[day]?.analysis || null;
}

export function setAnalysis(store, day, raw, now = Date.now()) {
  const prev = store?.[day] || { attempts: [] };
  return { ...store, [day]: { ...prev, analysis: sanitizeAnalysis(raw), at: now } };
}
```

- [ ] **Step 4: Chạy test cho chắc là XANH**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: PASS — 13 test

- [ ] **Step 5: Commit**

```bash
git add src/srs/tutor.js src/srs/tutor.test.js
git commit -m "feat: tutor.js - loc goi phan tich, bang nhan dung chung voi /assess"
```

---

## Task 3: Suy ra hồ sơ — `topErrors` / `focusFor` / `drillsFor` / `hintFor`

**Files:**
- Modify: `src/srs/tutor.js`
- Test: `src/srs/tutor.test.js`

- [ ] **Step 1: Viết test thất bại**

```js
import { topErrors, focusFor, drillsFor, hintFor, clearHint } from "./tutor.js";

const mkDay = (tags, extra = {}) => ({
  attempts: [],
  analysis: { errors: tags.map((t) => ({ tag: t, vi: "", evidence: "", fix: "" })),
              strengths: [], focus: "", drills: [], hints: [], ...extra },
});

describe("topErrors", () => {
  it("đếm gộp qua nhiều ngày, nhiều nhất lên đầu", () => {
    const store = { 1: mkDay(["mạo từ", "giới từ"]), 2: mkDay(["mạo từ"]), 3: mkDay(["mạo từ", "giới từ"]) };
    expect(topErrors(store, [], 2)).toEqual([
      { tag: "mạo từ", count: 3 },
      { tag: "giới từ", count: 2 },
    ]);
  });

  it("gộp cả tags từ chấm CEFR (speaking.js) vì dùng chung bảng nhãn", () => {
    const store = { 1: mkDay(["mạo từ"]) };
    const speaking = [{ tags: ["mạo từ", "phát âm"] }];
    expect(topErrors(store, speaking, 3)).toEqual([
      { tag: "mạo từ", count: 2 },
      { tag: "phát âm", count: 1 },
    ]);
  });

  it("chưa có gì → mảng rỗng", () => {
    expect(topErrors({}, [], 3)).toEqual([]);
  });
});

describe("focusFor / drillsFor", () => {
  it("focus lấy của NGÀY LỚN NHẤT có phân tích", () => {
    const store = { 1: mkDay([], { focus: "cũ" }), 4: mkDay([], { focus: "mới" }) };
    expect(focusFor(store)).toBe("mới");
    expect(focusFor({})).toBe("");
  });

  it("drillsFor(day) lấy drill sinh từ ngày TRƯỚC đó, không phải ngày hiện tại", () => {
    const store = {
      3: mkDay([], { drills: [{ vi: "a", en: "A" }] }),
      4: mkDay([], { drills: [{ vi: "b", en: "B" }] }),
    };
    expect(drillsFor(store, 4)).toEqual([{ vi: "a", en: "A" }]);
    expect(drillsFor(store, 1)).toEqual([]);
  });
});

describe("hintFor / useHint", () => {
  it("tìm được gợi ý theo itemId", () => {
    const store = { 2: mkDay([], { hints: [{ itemId: "pat::1", q: 2, why: "vấp mạo từ" }] }) };
    expect(hintFor(store, "pat::1")).toMatchObject({ q: 2, why: "vấp mạo từ" });
    expect(hintFor(store, "pat::99")).toBeNull();
  });

  it("clearHint xoá gợi ý sau khi dùng — chỉ nhắc MỘT lần", () => {
    const store = { 2: mkDay([], { hints: [{ itemId: "pat::1", q: 2, why: "x" }] }) };
    const next = clearHint(store, "pat::1");
    expect(hintFor(next, "pat::1")).toBeNull();
  });

  it("clearHint với id không tồn tại → trả nguyên store", () => {
    const store = { 2: mkDay([], { hints: [] }) };
    expect(clearHint(store, "pat::9")).toBe(store);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là ĐỎ**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: FAIL — `topErrors is not a function`

- [ ] **Step 3: Viết bản cài đặt tối thiểu**

Thêm vào `src/srs/tutor.js`:

```js
const daysDesc = (store) => Object.keys(store || {}).map(Number).filter(Boolean).sort((a, b) => b - a);

// Lỗi lặp nhiều nhất. Gộp HAI nguồn vì cả hai dùng chung ERROR_TAGS:
//   - phân tích cuối buổi (hằng ngày)
//   - chấm CEFR `speaking.js` (2–3 lần/tuần), mỗi entry có `tags`
export function topErrors(store = {}, speakingList = [], n = 5) {
  const counts = {};
  const bump = (tag) => {
    if (ERROR_TAGS.includes(tag)) counts[tag] = (counts[tag] || 0) + 1;
  };
  for (const day of Object.values(store)) for (const e of day?.analysis?.errors || []) bump(e.tag);
  for (const a of speakingList || []) for (const t of a?.tags || []) bump(t);
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, n);
}

// Điều cần chú ý, lấy của ngày GẦN NHẤT có phân tích.
export function focusFor(store = {}) {
  for (const d of daysDesc(store)) {
    const f = store[d]?.analysis?.focus;
    if (f) return f;
  }
  return "";
}

// Câu sửa lỗi cho buổi `day`: lấy từ ngày GẦN NHẤT TRƯỚC ĐÓ, không lấy của chính ngày này
// (phân tích của ngày N chạy lúc đóng ngày N, nên chỉ dùng được từ ngày N+1).
export function drillsFor(store = {}, day) {
  for (const d of daysDesc(store)) {
    if (d >= day) continue;
    const ds = store[d]?.analysis?.drills || [];
    if (ds.length) return ds;
  }
  return [];
}

export function hintFor(store = {}, itemId) {
  for (const d of daysDesc(store)) {
    const h = (store[d]?.analysis?.hints || []).find((x) => x.itemId === itemId);
    if (h) return h;
  }
  return null;
}

// Gợi ý chỉ nhắc MỘT lần: dùng xong thì gỡ, tránh nhắc mãi một lỗi đã sửa.
// KHÔNG đặt tên `useHint`: tiền tố `use` khiến quy tắc lint của React coi đây là hook, mà hàm này
// được gọi bên trong updater của setState — vi phạm rules-of-hooks.
export function clearHint(store = {}, itemId) {
  for (const d of daysDesc(store)) {
    const entry = store[d];
    const hints = entry?.analysis?.hints || [];
    if (!hints.some((x) => x.itemId === itemId)) continue;
    return {
      ...store,
      [d]: { ...entry, analysis: { ...entry.analysis, hints: hints.filter((x) => x.itemId !== itemId) } },
    };
  }
  return store;
}
```

- [ ] **Step 4: Chạy test cho chắc là XANH**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: PASS — 21 test

- [ ] **Step 5: Commit**

```bash
git add src/srs/tutor.js src/srs/tutor.test.js
git commit -m "feat: tutor.js - topErrors/focusFor/drillsFor/hintFor + test"
```

---

## Task 4: Báo cáo tuần

**Files:**
- Modify: `src/srs/tutor.js`
- Test: `src/srs/tutor.test.js`

- [ ] **Step 1: Viết test thất bại**

```js
import { weeklyReport } from "./tutor.js";

describe("weeklyReport", () => {
  const store = {
    // tuần 1 = ngày 1..6, tuần 2 = ngày 7..12
    1: mkDay(["mạo từ", "giới từ"]),
    2: mkDay(["mạo từ"]),
    7: mkDay(["mạo từ"]),
    8: mkDay(["trật tự từ"]),
  };

  it("so tuần này với tuần trước: giảm / mới / hết", () => {
    const r = weeklyReport(store, 2);
    expect(r.fixed).toEqual(["giới từ"]);          // tuần 1 có, tuần 2 hết
    expect(r.improved).toEqual([{ tag: "mạo từ", before: 2, after: 1 }]);
    expect(r.appeared).toEqual(["trật tự từ"]);    // tuần 2 mới xuất hiện
  });

  it("tuần 1 (không có tuần trước) → mọi lỗi đều là 'mới', không có 'hết'", () => {
    const r = weeklyReport(store, 1);
    expect(r.fixed).toEqual([]);
    expect(r.appeared.sort()).toEqual(["giới từ", "mạo từ"]);
  });

  it("tuần không có dữ liệu → mọi mảng rỗng", () => {
    expect(weeklyReport({}, 3)).toEqual({ fixed: [], improved: [], appeared: [], worse: [] });
  });

  it("lỗi tăng lên thì vào 'worse'", () => {
    const s = { 1: mkDay(["giới từ"]), 7: mkDay(["giới từ"]), 8: mkDay(["giới từ"]) };
    expect(weeklyReport(s, 2).worse).toEqual([{ tag: "giới từ", before: 1, after: 2 }]);
  });
});
```

- [ ] **Step 2: Chạy test cho chắc là ĐỎ**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: FAIL — `weeklyReport is not a function`

- [ ] **Step 3: Viết bản cài đặt tối thiểu**

Thêm vào `src/srs/tutor.js`:

```js
// Đếm nhãn lỗi trong một tuần (6 ngày/tuần, khớp §5).
function countsInWeek(store, week) {
  const from = (week - 1) * 6 + 1;
  const to = week * 6;
  const counts = {};
  for (let d = from; d <= to; d++) {
    for (const e of store?.[d]?.analysis?.errors || []) {
      if (ERROR_TAGS.includes(e.tag)) counts[e.tag] = (counts[e.tag] || 0) + 1;
    }
  }
  return counts;
}

// So tuần này với tuần trước. So TƯƠNG ĐỐI chứ không phải điểm tuyệt đối: "mạo từ từ 6 xuống 1"
// có ý nghĩa với người học, "bạn đạt B1" thì không.
export function weeklyReport(store = {}, week) {
  const before = countsInWeek(store, week - 1);
  const after = countsInWeek(store, week);
  const fixed = [];
  const improved = [];
  const worse = [];
  const appeared = [];
  for (const tag of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[tag] || 0;
    const a = after[tag] || 0;
    if (b && !a) fixed.push(tag);
    else if (!b && a) appeared.push(tag);
    else if (a < b) improved.push({ tag, before: b, after: a });
    else if (a > b) worse.push({ tag, before: b, after: a });
  }
  return { fixed: fixed.sort(), improved, appeared: appeared.sort(), worse };
}
```

- [ ] **Step 4: Chạy test cho chắc là XANH**

Chạy: `npx vitest run src/srs/tutor.test.js`
Kỳ vọng: PASS — 25 test

- [ ] **Step 5: Commit**

```bash
git add src/srs/tutor.js src/srs/tutor.test.js
git commit -m "feat: tutor.js - weeklyReport so tuan nay voi tuan truoc"
```

---

## Task 5: Route `/tutor` trong proxy

**Files:**
- Modify: `server/proxy.mjs` (thêm `handleTutor` trước hằng `ROUTES` ở dòng ~358; thêm dòng vào `ROUTES`)

Không có unit test cho proxy (theo lệ repo — xem CLAUDE.md §Test). Kiểm chứng bằng `curl`/node ở Step 4.

- [ ] **Step 1: Thêm `handleTutor`**

Chèn ngay TRƯỚC `const ROUTES = {`:

```js
// Phân tích cuối buổi (spec §10.4). Nhận toàn bộ câu người học nói trong ngày, trả lỗi + 2 câu sửa
// + 1 điều cần chú ý + gợi ý mức nhớ cho lần gặp sau.
//
// Hai điều BẮT BUỘC nói với Claude, đây là chỗ quyết định chất lượng:
//  1. Bản ghi từ nhận dạng giọng CÓ THỂ SAI — bỏ qua sai lệch giống lỗi nghe.
//  2. Nhãn lỗi phải chọn NGUYÊN VĂN từ bảng, trùng bảng của /assess để hồ sơ cộng lại được.
async function handleTutor(body) {
  const { level = "A2", pattern = "", attempts = [], recentErrors = [] } = body;
  const lines = attempts
    .slice(0, 40)
    .map((a, i) => `${i + 1}. [${a.itemId || a.kind || "drill"}] đích: "${a.target}" | nghe được: "${a.heard}" | khớp ${Math.round((a.score || 0) * 100)}%`)
    .join("\n");
  const recent = recentErrors.map((e) => `${e.tag} (${e.count} lần)`).join(", ");

  const out = await callClaude({
    model: MODEL_SMART,
    maxTokens: 900,
    system:
      "Bạn là gia sư nói tiếng Anh, đang xem lại buổi học hôm nay của một học viên người Việt trình độ " + level + ". " +
      (pattern ? 'Mẫu câu hôm nay: "' + pattern + '". ' : "") +
      (recent ? "Lỗi dai dẳng gần đây: " + recent + ". " : "") +
      "QUAN TRỌNG: phần 'nghe được' do Whisper nhận dạng nên CÓ THỂ SAI. " +
      "BỎ QUA mọi sai lệch giống lỗi nghe (âm gần giống, mất âm cuối, nối âm, đồng âm). " +
      "Chỉ bắt lỗi có HÌNH DẠNG NGỮ PHÁP THẬT. Khớp thấp mà câu nghe được vẫn hợp lý → coi là nghe nhầm, KHÔNG phải lỗi. " +
      "THÀ BỎ SÓT CÒN HƠN BỊA RA LỖI. " +
      'CHỈ trả JSON: {"errors":[{"tag":"..","vi":"..","evidence":"..","fix":".."}],"strengths":[".."],' +
      '"focus":"..","drills":[{"vi":"..","en":".."}],"hints":[{"itemId":"..","q":2,"why":".."}]}. ' +
      "tag CHỌN NGUYÊN VĂN từ: " +
      '"mạo từ","chia động từ/thì","số ít-số nhiều","giới từ","trật tự từ","từ vựng hạn chế","liên kết-mạch lạc","phát âm","ngập ngừng-trôi chảy". ' +
      "focus = ĐÚNG MỘT điều cần chú ý buổi sau, tiếng Việt, ngắn. " +
      "drills = ĐÚNG 2 câu luyện nhắm vào lỗi vừa thấy (vi = câu tiếng Việt để dịch, en = câu tiếng Anh chuẩn). " +
      "hints = chỉ cho dòng có itemId, q là 2 (chưa nhớ) / 3 (khó) / 4 (tốt) / 5 (dễ), why ngắn bằng tiếng Việt. " +
      "Không có lỗi đáng kể thì errors=[]. Mọi chữ tiếng Việt ngắn & cụ thể. KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: lines || "(học viên không nói câu nào)" }],
  });
  return extractJsonObject(out) || { errors: [], strengths: [], focus: "", drills: [], hints: [] };
}
```

- [ ] **Step 2: Đăng ký route**

Sửa hằng `ROUTES`, thêm một dòng:

```js
const ROUTES = {
  "/": handleChat,
  "/scenario": handleScenario,
  "/mine": handleMine,
  "/story": handleStory,
  "/assess": handleAssess,
  "/summary": handleSummary,
  "/translate": handleTranslate,
  "/ipa": handleIpa,
  "/patterns": handlePatterns,
  "/tutor": handleTutor,
};
```

- [ ] **Step 3: Nạp lại proxy trên cura-dev**

```bash
bash scripts/deploy.sh proxy
```

Kỳ vọng: `✓ Deploy xong.`

- [ ] **Step 4: Gọi thử thật**

```bash
ssh root@192.168.100.162 'cd /opt/srf && set -a && . ./.env && set +a && docker compose exec -T -e PS="$PROXY_SECRET" proxy node -e "
fetch(\"http://localhost:8787/tutor\",{method:\"POST\",headers:{\"content-type\":\"application/json\",\"x-proxy-secret\":process.env.PS},
body:JSON.stringify({level:\"A2\",pattern:\"I%27d like + N\",attempts:[{itemId:\"pat::1\",kind:\"drill\",target:\"I%27d like a tea.\",heard:\"I like a tea\",score:0.75}]})})
.then(async r=>{console.log(r.status);console.log((await r.text()).slice(0,500))});
"'
```

Kỳ vọng: `200` và JSON có `errors` chứa tag `"mạo từ"`, `drills` có 2 câu.

- [ ] **Step 5: Commit**

```bash
git add server/proxy.mjs
git commit -m "feat: proxy route /tutor - phan tich cuoi buoi (Phan 10)"
```

---

## Task 6: Client `ai/tutor.js`

**Files:**
- Create: `src/ai/tutor.js`

- [ ] **Step 1: Viết client**

```js
// Client gọi proxy /tutor → phân tích cuối buổi. Không token ở client (C7).
// Trả { errors[], strengths[], focus, drills[], hints[] } — CHƯA lọc; lọc ở srs/tutor.js.
import { authHeaders } from "./auth.js";

const URL = import.meta.env.VITE_PROXY_URL;
const TIMEOUT_MS = 30_000;

export async function analyzeSession({ level = "A2", pattern = "", attempts = [], recentErrors = [] }) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(URL.replace(/\/$/, "") + "/tutor", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ level, pattern, attempts, recentErrors }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error("proxy lỗi " + r.status);
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 2: Kiểm build**

Chạy: `npx vite build`
Kỳ vọng: build sạch, không lỗi import.

- [ ] **Step 3: Commit**

```bash
git add src/ai/tutor.js
git commit -m "feat: ai/tutor.js - client goi /tutor, co gioi han 30s"
```

---

## Task 7: Thu thập attempt trong buổi

`SpeakCheck` là nơi DUY NHẤT chấm câu nói (nhịp 0/3/4/4b đều dùng nó), nên báo attempt từ đây là đủ cho mọi nhịp.

**Files:**
- Modify: `src/components/SpeakCheck.jsx`
- Modify: `src/components/StepSpeak.jsx`, `src/components/StepReview.jsx`, `src/components/StepWords.jsx` (truyền prop xuống)
- Modify: `src/hooks/useLesson.js`

- [ ] **Step 1: `SpeakCheck` báo attempt ra ngoài**

Trong `src/components/SpeakCheck.jsx`, đổi chữ ký và gọi thêm `onAttempt`:

```jsx
export default function SpeakCheck({ target, prompt, footer, autoHint = false, onAttempt, kind, itemId }) {
```

Trong `onResult`, ngay sau khi tính `score`, thêm:

```jsx
      setResult({ text, diff, score });
      onAttempt?.({ kind, itemId, target, heard: text, score });
      (score >= PASS ? good : miss)();
```

Thêm `onAttempt`, `kind`, `itemId` vào mảng deps của `useCallback`:

```jsx
    [target, onAttempt, kind, itemId]
```

- [ ] **Step 2: Ba màn truyền prop xuống**

`StepSpeak.jsx` — thêm `onAttempt` vào chữ ký rồi truyền vào `SpeakCheck`:

```jsx
export default function StepSpeak({ lesson, bar, drills, kicker, onDone, onSaid, onAttempt }) {
```
```jsx
      <SpeakCheck
        key={d.en}
        target={d.en}
        kind={kicker === "Nói ra" ? "drill" : "drill2"}
        onAttempt={onAttempt}
```

`StepReview.jsx`:

```jsx
export default function StepReview({ bar, queue, getState, onRate, onDone, onAttempt }) {
```
```jsx
      <SpeakCheck
        key={item.id}
        target={v.en}
        kind="review"
        itemId={item.id}
        onAttempt={onAttempt}
```

`StepWords.jsx`:

```jsx
export default function StepWords({ lesson, bar, onDone, onAttempt }) {
```
```jsx
          <SpeakCheck
            key={w.w}
            target={w.en}
            kind="words"
            onAttempt={onAttempt}
```

- [ ] **Step 3: `useLesson` giữ kho tutor + hàm `attempt`**

Trong `src/hooks/useLesson.js`, thêm import:

```js
import { loadTutor, saveTutor, addAttempt } from "../srs/tutor.js";
```

Thêm state cạnh `myWords`:

```js
  const [tutor, setTutor] = useState(loadTutor);
```

Thêm hàm, đặt ngay trước `said`:

```js
  // Ghi lại một lần nói để cuối ngày gửi gia sư phân tích (spec §10.3).
  const attempt = useCallback(
    (a) => {
      if (!lesson) return;
      setTutor((prev) => {
        const next = addAttempt(prev, lesson.day, a, Date.now());
        saveTutor(next);
        return next;
      });
    },
    [lesson]
  );
```

Thêm vào object trả về:

```js
    tutor,
    attempt,
```

- [ ] **Step 4: `App.jsx` truyền `onAttempt` vào 3 màn**

Trong `src/App.jsx`, thêm `onAttempt={L.attempt}` vào `StepReview`, `StepSpeak` (cả hai chỗ `speak` và `speak2`), và `StepWords`.

- [ ] **Step 5: Kiểm chứng bằng trình duyệt**

```bash
npx vite build && npx vite preview --port 4173 --strictPort
```

Mở `http://localhost:4173`, học tới nhịp nói, nói một câu (hoặc để mic lỗi rồi bấm thử lại), rồi chạy trong console trình duyệt:

```js
JSON.parse(localStorage.getItem("srf-tutor-v1"))
```

Kỳ vọng: có khoá theo ngày, `attempts` chứa `{kind, target, heard, score, at}`.

- [ ] **Step 6: Commit**

```bash
git add src/components/SpeakCheck.jsx src/components/StepSpeak.jsx src/components/StepReview.jsx src/components/StepWords.jsx src/hooks/useLesson.js src/App.jsx
git commit -m "feat: thu thap attempt moi lan noi, luu vao srf-tutor-v1"
```

---

## Task 8: Kích hoạt phân tích nền khi đóng ngày

**Files:**
- Modify: `src/hooks/useLesson.js`

- [ ] **Step 1: Thêm import**

```js
import { analyzeSession } from "../ai/tutor.js";
import { setAnalysis, topErrors, attemptsFor } from "../srs/tutor.js";
import { loadSpeaking, latestLevel } from "../srs/speaking.js";
```

- [ ] **Step 2: Gọi phân tích trong `complete`, KHÔNG await**

Trong `complete`, ngay sau `if (!nextStep(lesson, next, { ext: mode === "ext" })) setMode("done");`, thêm:

```js
      // Đóng ngày → phân tích nền. KHÔNG await: màn đóng ngày là khoảnh khắc trả công duy nhất
      // trong ngày (§4.1), bắt nó chờ LLM là hỏng. Hỏng thì im lặng bỏ qua (§10.8).
      if (which === "speak" || which === "chat") {
        const day = lesson.day;
        const attempts = attemptsFor(tutor, day);
        if (attempts.length) {
          analyzeSession({
            level: latestLevel(loadSpeaking()) || "A2",
            pattern: lesson.pat || "",
            attempts,
            recentErrors: topErrors(tutor, loadSpeaking(), 3),
          })
            .then((raw) => {
              setTutor((prev) => {
                const nx = setAnalysis(prev, day, raw, Date.now());
                saveTutor(nx);
                return nx;
              });
            })
            .catch(() => {
              /* mạng lỗi / token hết hạn / Claude chậm → buổi sau chạy như chưa có gia sư (§10.8) */
            });
        }
      }
```

- [ ] **Step 3: Thêm `tutor` vào deps của `complete`**

```js
    [lesson, progress, mode, persist, tutor]
```

- [ ] **Step 4: Kiểm chứng**

```bash
npx vitest run
```
Kỳ vọng: 151 test vẫn PASS (không test nào chạm `useLesson`).

Rồi kiểm tay: học trọn một buổi trên bản live, đợi ~15s, chạy trong console:

```js
JSON.parse(localStorage.getItem("srf-tutor-v1"))
```
Kỳ vọng: ngày vừa học có `analysis` khác `null`, trong đó `drills` có 2 câu.

- [ ] **Step 5: Kiểm suy biến — tắt proxy**

```bash
ssh root@192.168.100.162 'cd /opt/srf && docker compose stop proxy'
```
Học trọn một buổi. Kỳ vọng: **không hiện lỗi nào**, màn đóng ngày bình thường, `analysis` là `null`.

```bash
ssh root@192.168.100.162 'cd /opt/srf && docker compose start proxy'
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLesson.js
git commit -m "feat: dong ngay -> goi /tutor chay NEN, hong thi im lang bo qua"
```

---

## Task 9: Chèn 2 câu sửa lỗi vào đầu nhịp 4

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/StepSpeak.jsx`

- [ ] **Step 1: `App.jsx` trộn drill sửa lỗi với drill của bài**

Thêm import:

```js
import { drillsFor } from "./srs/tutor.js";
```

Trong `AppMain`, thêm trước phần `switch`:

```js
  // 2 câu sửa lỗi của hôm qua THAY CHỖ 2 câu cuối, không cộng thêm — nhịp 4 vẫn 5 câu, giữ
  // nguyên ngân sách 15–18 phút (§3.1, §10.6a).
  const fixDrills = useMemo(
    () => (lesson ? drillsFor(L.tutor, lesson.day) : []),
    [L.tutor, lesson]
  );
  const speakDrills = useMemo(() => {
    const own = lesson?.drills || [];
    if (!fixDrills.length) return own;
    return [...fixDrills, ...own.slice(0, Math.max(0, own.length - fixDrills.length))];
  }, [fixDrills, lesson]);
```

Đổi case `"speak"`:

```jsx
      case "speak":
        return (
          <StepSpeak
            {...shared}
            drills={speakDrills}
            fixCount={fixDrills.length}
            kicker="Nói ra"
            onDone={done}
            onSaid={L.said}
            onAttempt={L.attempt}
          />
        );
```

- [ ] **Step 2: `StepSpeak` gắn nhãn cho câu sửa lỗi**

Đổi chữ ký:

```jsx
export default function StepSpeak({ lesson, bar, drills, kicker, onDone, onSaid, onAttempt, fixCount = 0 }) {
```

Thêm ngay sau `const last = ...`:

```jsx
  const isFix = i < fixCount; // 2 câu đầu là câu sửa lỗi hôm qua
```

Trong `prompt`, đổi dòng nhắc mẫu câu:

```jsx
            <p className="muted small">
              {isFix ? "🔧 Sửa lỗi hôm qua" : <>Mẫu: <b>{lesson.pat}</b></>}
            </p>
```

- [ ] **Step 3: Kiểm chứng**

```bash
npx vitest run && npx vite build
```
Kỳ vọng: 151 test PASS, build sạch.

Kiểm tay: đặt sẵn dữ liệu trong console rồi mở nhịp nói:

```js
localStorage.setItem("srf-tutor-v1", JSON.stringify({
  1: { attempts: [], analysis: { errors: [], strengths: [], focus: "mạo từ",
       drills: [{ vi: "Cho tôi một cà phê.", en: "I'd like a coffee." },
                { vi: "Tôi muốn một cái bánh.", en: "I'd like a cake." }], hints: [] } }
}));
```
Kỳ vọng: ở bài ngày 2, hai câu đầu của nhịp nói là hai câu trên, có nhãn "🔧 Sửa lỗi hôm qua", tổng vẫn 5 câu.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/StepSpeak.jsx
git commit -m "feat: chen 2 cau sua loi hom qua vao dau nhip noi (thay cho, khong cong them)"
```

---

## Task 10: Gợi ý mức nhớ ở nhịp ôn

**Files:**
- Modify: `src/components/StepReview.jsx`
- Modify: `src/hooks/useLesson.js`

- [ ] **Step 1: `useLesson` cung cấp `hint` + `consumeHint`**

Thêm import:

```js
import { hintFor, clearHint } from "../srs/tutor.js";
```

Thêm hai hàm, đặt cạnh `attempt`:

```js
  const hintOf = useCallback((itemId) => hintFor(tutor, itemId), [tutor]);

  // Gợi ý chỉ nhắc MỘT lần — dùng xong thì gỡ khỏi kho.
  const consumeHint = useCallback((itemId) => {
    setTutor((prev) => {
      const next = clearHint(prev, itemId);
      if (next !== prev) saveTutor(next);
      return next;
    });
  }, []);
```

Thêm vào object trả về:

```js
    hintOf,
    consumeHint,
```

- [ ] **Step 2: `App.jsx` truyền xuống**

```jsx
      case "review":
        return (
          <StepReview
            bar={L.bar}
            queue={L.reviewQueue}
            getState={L.getState}
            onRate={L.rate}
            onDone={done}
            onAttempt={L.attempt}
            hintOf={L.hintOf}
            onUseHint={L.consumeHint}
          />
        );
```

- [ ] **Step 3: `StepReview` làm nổi mức gợi ý**

Đổi chữ ký:

```jsx
export default function StepReview({ bar, queue, getState, onRate, onDone, onAttempt, hintOf, onUseHint }) {
```

Thêm sau `const v = promptFor(item, state);`:

```jsx
  const hint = hintOf?.(item.id) || null;
```

Đổi hàm `rate` để gỡ gợi ý sau khi dùng:

```jsx
  const rate = (q) => {
    tick();
    if (hint) onUseHint?.(item.id);
    onRate(item.id, q);
    if (last) onDone();
    else setI(i + 1);
  };
```

Trong `footer`, thay dòng "Bạn tự chấm" và thanh `rate`:

```jsx
            {hint ? (
              <p className="muted small center" style={{ margin: 0 }}>
                Gia sư gợi ý: <b style={{ color: "var(--lime)" }}>{hint.why}</b> — bạn vẫn là người chốt
              </p>
            ) : (
              <p className="muted small center" style={{ margin: 0 }}>
                Bạn tự chấm — máy chỉ gợi ý{result.score >= PASS ? " (nghe khớp)" : " (nghe còn lệch)"}
              </p>
            )}
            <div className="rate">
              <button className={`btn rate-again${hint?.q === 2 ? " rate-tip" : ""}`} onClick={() => rate(2)}>Chưa nhớ</button>
              <button className={`btn${hint?.q === 3 ? " rate-tip" : ""}`} onClick={() => rate(3)}>Khó</button>
              <button className={`btn ${result.score >= PASS ? "rate-good" : ""}${hint?.q === 4 ? " rate-tip" : ""}`} onClick={() => rate(4)}>Tốt</button>
              <button className={`btn${hint?.q === 5 ? " rate-tip" : ""}`} onClick={() => rate(5)}>Dễ</button>
            </div>
```

- [ ] **Step 4: Thêm CSS**

Thêm vào cuối `src/styles.css`:

```css
/* Mức gia sư gợi ý ở nhịp ôn — chỉ làm NỔI, không tự bấm thay người học (C5′). */
.rate-tip {
  border-color: var(--lime);
  box-shadow: 0 0 0 1px var(--lime), 0 10px 26px -16px rgba(200, 250, 60, 0.9);
}
```

- [ ] **Step 5: Kiểm chứng**

```bash
npx vitest run && npx vite build
```
Kỳ vọng: 151 test PASS, build sạch.

Kiểm tay: đặt dữ liệu rồi vào nhịp ôn:

```js
localStorage.setItem("srf-tutor-v1", JSON.stringify({
  1: { attempts: [], analysis: { errors: [], strengths: [], focus: "", drills: [],
       hints: [{ itemId: "pat::1", q: 2, why: "lần trước vấp mạo từ" }] } }
}));
```
Kỳ vọng: khi item `pat::1` lên, nút "Chưa nhớ" có viền sáng + dòng "Gia sư gợi ý: lần trước vấp mạo từ". Bấm xong, mở lại lần nữa thì KHÔNG còn gợi ý.

- [ ] **Step 6: Commit**

```bash
git add src/components/StepReview.jsx src/hooks/useLesson.js src/App.jsx src/styles.css
git commit -m "feat: nhip on lam noi muc gia su goi y, nguoi hoc van chot (C5')"
```

---

## Task 11: Lái trò chuyện theo điểm yếu

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/hooks/useCall.js`

- [ ] **Step 1: `useCall` nhận `focus` từ ngoài**

Trong `src/hooks/useCall.js`, đổi chữ ký:

```js
export function useCall({ dueWords = [], level = "A2", topic = "", roleplay = false, onAddWord, focusHint = "" }) {
```

Đổi dòng tính `focus`:

```js
  // Điểm yếu từ hồ sơ gia sư (§10.6c) ưu tiên hơn hồ sơ CEFR — nó tươi hơn, cập nhật hằng ngày.
  const profileFocus = useMemo(buildFocus, []);
  const focus = focusHint || profileFocus;
```

- [ ] **Step 2: `Call.jsx` truyền tiếp**

```jsx
export default function Call({ dueWords = [], level = "A2", topic = "", roleplay = false, onAddWord, focusHint = "", onBack }) {
```
```js
  const c = useCall({ dueWords, level, topic: roleplay ? topic : chosen || topic, roleplay, onAddWord, focusHint });
```

- [ ] **Step 3: `App.jsx` tính focus và truyền vào cả 3 chỗ dùng `Call`**

Thêm import:

```js
import { focusFor, topErrors } from "./srs/tutor.js";
import { loadSpeaking } from "./srs/speaking.js";
```

Thêm trong `AppMain`:

```js
  // Gia sư ép đúng chỗ đang yếu: điểm chú ý mới nhất + 2 lỗi dai dẳng nhất.
  const focusHint = useMemo(() => {
    const f = focusFor(L.tutor);
    const tags = topErrors(L.tutor, loadSpeaking(), 2).map((e) => e.tag).join(", ");
    return [f, tags && "lỗi hay lặp: " + tags].filter(Boolean).join(" · ");
  }, [L.tutor]);
```

Thêm `focusHint={focusHint}` vào cả ba chỗ render `<Call ...>`.

- [ ] **Step 4: Kiểm chứng**

```bash
npx vite build
```
Kỳ vọng: build sạch.

Kiểm tay trên bản live: đặt `focus` giả vào `srf-tutor-v1`, mở Trò chuyện, bấm Bắt đầu gọi. Kỳ vọng: câu mở lời của gia sư bám vào điểm yếu đó.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/Call.jsx src/hooks/useCall.js
git commit -m "feat: gia su lai hoi thoai theo diem yeu tu ho so (Phan 10.6c)"
```

---

## Task 12: Báo cáo tuần ở ngày chốt tuần

**Files:**
- Create: `src/components/WeekReport.jsx`
- Modify: `src/App.jsx`
- Modify: `src/srs/lesson.js` (thêm bước `report` vào `WEEK_STEPS`)
- Modify: `src/srs/lesson.test.js`

- [ ] **Step 1: Viết test thất bại cho bước mới**

Sửa test trong `src/srs/lesson.test.js`:

```js
  it("ngày chốt tuần: bộ bước riêng, có báo cáo trước khi ôn", () => {
    expect(coreStepsFor(weekClose)).toEqual(["report", "review", "assess", "chat"]);
    expect(extStepsFor(weekClose)).toEqual([]);
    expect(isWeekClose(weekClose)).toBe(true);
  });
```

- [ ] **Step 2: Chạy test cho chắc là ĐỎ**

Chạy: `npx vitest run src/srs/lesson.test.js`
Kỳ vọng: FAIL — nhận `["review","assess","chat"]`

- [ ] **Step 3: Sửa `WEEK_STEPS`**

Trong `src/srs/lesson.js`:

```js
export const WEEK_STEPS = ["report", "review", "assess", "chat"]; // ngày chốt tuần (§3.4, §10.6b)
```

- [ ] **Step 4: Sửa test `stepProgress` bị vỡ theo**

Thêm một bước vào `WEEK_STEPS` làm tổng số nhịp của ngày chốt tuần đổi từ 3 → 4, nên test sẵn có
cũng phải sửa. Trong `src/srs/lesson.test.js`, đổi dòng cuối của `describe("lastCompleted / stepProgress")`:

```js
    expect(stepProgress(weekClose, {})).toMatchObject({ index: 0, total: 4 });
```

- [ ] **Step 5: Chạy test cho chắc là XANH**

Chạy: `npx vitest run src/srs/lesson.test.js`
Kỳ vọng: PASS — 17 test

- [ ] **Step 6: Viết `WeekReport.jsx`**

```jsx
// Báo cáo tiến bộ ở ngày chốt tuần (§10.6b). So với TUẦN TRƯỚC, không phải điểm tuyệt đối:
// "mạo từ từ 6 lần xuống 1" có nghĩa với người học, "bạn đạt B1" thì không.
import StepShell from "./StepShell.jsx";

function Row({ icon, tone, children }) {
  return (
    <div className="ex-row">
      <span style={{ color: tone, fontWeight: 700, flex: "0 0 auto" }}>{icon}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function WeekReport({ lesson, bar, report, onDone }) {
  const empty =
    !report.fixed.length && !report.improved.length && !report.appeared.length && !report.worse.length;

  return (
    <StepShell bar={bar} kicker={`Chốt tuần ${lesson.week}`} title="Tuần này khá lên chỗ nào">
      {empty ? (
        <p className="muted">
          Chưa đủ dữ liệu để so sánh. Học thêm vài ngày nữa là có báo cáo.
        </p>
      ) : (
        <div className="card">
          {report.fixed.map((t) => (
            <Row key={t} icon="✓" tone="var(--ok)"><b>{t}</b> — tuần này không còn mắc</Row>
          ))}
          {report.improved.map((x) => (
            <Row key={x.tag} icon="↓" tone="var(--lime)">
              <b>{x.tag}</b> — từ {x.before} lần xuống {x.after}
            </Row>
          ))}
          {report.worse.map((x) => (
            <Row key={x.tag} icon="↑" tone="var(--ember)">
              <b>{x.tag}</b> — từ {x.before} lần lên {x.after}
            </Row>
          ))}
          {report.appeared.map((t) => (
            <Row key={t} icon="•" tone="var(--muted)"><b>{t}</b> — mới xuất hiện tuần này</Row>
          ))}
        </div>
      )}
      <div className="spacer" />
      <button className="btn btn-primary" onClick={onDone}>Bắt đầu chốt tuần</button>
    </StepShell>
  );
}
```

- [ ] **Step 7: Nối vào `App.jsx`**

Thêm import:

```js
import WeekReport from "./components/WeekReport.jsx";
import { weeklyReport } from "./srs/tutor.js";
```

Thêm case vào `switch`:

```jsx
      case "report":
        return (
          <WeekReport
            lesson={lesson}
            bar={L.bar}
            report={weeklyReport(L.tutor, lesson.week)}
            onDone={done}
          />
        );
```

- [ ] **Step 8: Kiểm chứng**

```bash
npx vitest run && npx vite build
```
Kỳ vọng: 176 test PASS, build sạch.

- [ ] **Step 9: Commit**

```bash
git add src/components/WeekReport.jsx src/App.jsx src/srs/lesson.js src/srs/lesson.test.js
git commit -m "feat: bao cao tien bo o ngay chot tuan (Phan 10.6b)"
```

---

## Task 13: Cập nhật tài liệu & deploy

**Files:**
- Modify: `TODO.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Đánh dấu trong `TODO.md`**

Thêm mục mới sau phần "Dọn & triển khai":

```markdown
## Phần 10 — Gia sư (spec §10)

- [x] **T1–T4** `srs/tutor.js` + test: kho, lọc gói, `topErrors`/`focusFor`/`drillsFor`/`hintFor`, `weeklyReport`
- [x] **T5–T6** proxy route `/tutor` + client `ai/tutor.js` (giới hạn 30s)
- [x] **T7–T8** thu thập attempt; đóng ngày gọi phân tích **chạy nền**
- [x] **T9** 2 câu sửa lỗi chèn đầu nhịp nói (thay chỗ, không cộng thêm)
- [x] **T10** nhịp ôn làm nổi mức gia sư gợi ý (C5′)
- [x] **T11** lái trò chuyện theo điểm yếu
- [x] **T12** báo cáo tuần ở ngày chốt tuần
```

- [ ] **Step 2: Thêm mục cấu trúc vào `CLAUDE.md`**

Trong phần "Lõi thuần tách khỏi UI", thêm một dòng:

```markdown
  - `srs/tutor.js` — hồ sơ gia sư: attempt, gói phân tích, lỗi lặp, báo cáo tuần
```

- [ ] **Step 3: Chạy toàn bộ test**

Chạy: `npx vitest run`
Kỳ vọng: **≥176 test PASS** (151 cũ + 25 mới của `tutor.test.js`).

- [ ] **Step 4: Deploy**

```bash
bash scripts/deploy.sh
```
Kỳ vọng: `✓ Deploy xong.`

- [ ] **Step 5: Nghiệm thu tay trên bản live (§10.9)**

1. Học trọn một buổi, **cố ý bỏ mạo từ** ở 2 câu. Đợi ~20s.
2. Hôm sau (hoặc đặt `srf-course-v1` sang ngày kế): nhịp nói phải có 2 câu "🔧 Sửa lỗi hôm qua" nhắm vào mạo từ.
3. Nói ĐÚNG một câu nhưng để Whisper nghe nhầm → gia sư **KHÔNG** báo đó là lỗi ngữ pháp.
4. Tắt proxy, học trọn một buổi → không lỗi nào hiện ra.

- [ ] **Step 6: Commit**

```bash
git add TODO.md CLAUDE.md
git commit -m "docs: danh dau Phan 10 hoan tat + cap nhat cau truc"
git push origin main
```
