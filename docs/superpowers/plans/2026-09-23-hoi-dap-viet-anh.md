# Hỏi đáp Việt→Anh (Phần 11) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gõ một câu tiếng Việt ở bất kỳ màn nào → nhận đúng một câu tiếng Anh tự nhiên + IPA + cách dùng + một cách nói khác, nghe được bằng TTS, nói thử được, và lưu được vào hàng đợi ôn.

**Architecture:** Route proxy mới `/ask` trả JSON cứng. Kho thuần `src/srs/ask.js` giữ 20 câu gần nhất kèm câu trả lời. Nút nổi `AskFab` gắn một lần ở `AppShell` nên có mặt mọi màn. Kết quả nối vào hạ tầng đã có: ⭐ gọi `L.addWord` (vào `myWords` → `itemsFor` → nhịp ôn), 🎙️ dùng lại `SpeakCheck` (attempt → hồ sơ gia sư). Không store mới, không đụng `sm2.js`.

**Tech Stack:** Vite + React (JS thuần, không TypeScript) · Vitest (`environment: "node"`, localStorage giả viết tay) · Node HTTP proxy (`server/proxy.mjs`) · Kokoro TTS + Whisper đã có.

**Spec:** [`docs/superpowers/specs/2026-09-23-hoi-dap-viet-anh-design.md`](../specs/2026-09-23-hoi-dap-viet-anh-design.md)

**Branch:** `hoi-dap-phan-11` (đã tạo, đã có commit spec `c092bd4`).

---

## Cấu trúc file

| File | Trách nhiệm | Task |
|---|---|---|
| `src/srs/ask.js` (tạo) | Kho 20 câu + `sanitizeAnswer`. Thuần, không React. | 1, 2 |
| `src/srs/ask.test.js` (tạo) | Test cho trên. | 1, 2 |
| `server/proxy.mjs` (sửa) | `handleAsk` + **một dòng** vào `ROUTES`. | 3 |
| `src/ai/ask.js` (tạo) | Gọi proxy, timeout 20s. | 4 |
| `src/styles.css` (sửa) | `.fab`, `.sheet-*`, `.ask-*`, `.chips`, `.screen` padding. | 5 |
| `src/components/AskSheet.jsx` (tạo) | Chỉ vẽ. Nhận mọi thứ qua props. | 6 |
| `src/components/AskFab.jsx` (tạo) | Nút nổi + giữ trạng thái + nối mạng/kho. | 7 |
| `src/App.jsx` (sửa) | Gắn FAB một lần cho mọi màn. | 8 |
| `CLAUDE.md`, spec, `TODO.md` (sửa) | Ghi ngoại lệ C10 + trạng thái. | 10 |

**Quy tắc bất di bất dịch khi làm:**

- `src/srs/*.js` không import React, không gọi `Date.now()` bên trong (truyền qua tham số `now`), **không bao giờ mutate tham số**.
- Trong `server/proxy.mjs`, bảng `ROUTES` chỉ được **thêm một dòng**. Không dán đè cả khối — lần trước suýt xoá mất route `/coach` đang chạy thật vì dán một ảnh chụp cũ.
- Không đụng `src/srs/sm2.js`. 177 test hiện có phải pass nguyên vẹn sau mỗi task.

---

### Task 1: Kho câu hỏi — `loadAsk` / `saveAsk` / `addAsk` / `recentAsks`

**Files:**
- Create: `src/srs/ask.js`
- Create: `src/srs/ask.test.js`

- [ ] **Step 1: Viết test trước (sẽ đỏ)**

Tạo `src/srs/ask.test.js`:

```js
import { beforeEach, describe, expect, it } from "vitest";
import { loadAsk, saveAsk, addAsk, recentAsks, normVi, ASK_KEY, MAX_ASKS } from "./ask.js";

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
const NOW = 1_700_000_000_000;
const A = { en: "Could I get the bill?", ipa: "/kʊd aɪ ɡet ðə bɪl/", use: "Lịch sự.", say: "", alt: null };

beforeEach(() => {
  globalThis.localStorage = mockLocalStorage();
});

describe("load / save", () => {
  it("chưa có gì → mảng rỗng", () => expect(loadAsk()).toEqual([]));

  it("lưu rồi đọc lại", () => {
    saveAsk(addAsk([], "cho tôi xin hoá đơn", A, NOW));
    expect(loadAsk()[0].vi).toBe("cho tôi xin hoá đơn");
    expect(localStorage.getItem(ASK_KEY)).toBeTruthy();
  });

  it("JSON hỏng → rỗng, không ném lỗi", () => {
    localStorage.setItem(ASK_KEY, "{{{");
    expect(loadAsk()).toEqual([]);
  });

  it("localStorage lưu một object (không phải mảng) → rỗng", () => {
    localStorage.setItem(ASK_KEY, '{"a":1}');
    expect(loadAsk()).toEqual([]);
  });
});

describe("addAsk", () => {
  it("câu mới đứng ĐẦU", () => {
    const s1 = addAsk([], "câu một", A, NOW);
    const s2 = addAsk(s1, "câu hai", A, NOW + 1);
    expect(s2.map((x) => x.vi)).toEqual(["câu hai", "câu một"]);
  });

  it("KHÔNG mutate tham số", () => {
    const s0 = addAsk([], "câu một", A, NOW);
    const before = JSON.stringify(s0);
    addAsk(s0, "câu hai", A, NOW + 1);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it("lưu kèm câu trả lời và mốc thời gian", () => {
    expect(addAsk([], "xin chào", A, NOW)[0]).toEqual({ vi: "xin chào", a: A, at: NOW });
  });

  it("hỏi lại câu cũ → đẩy lên đầu, KHÔNG nhân đôi", () => {
    let s = addAsk([], "câu một", A, NOW);
    s = addAsk(s, "câu hai", A, NOW + 1);
    s = addAsk(s, "  CÂU   Một  ", A, NOW + 2); // khác hoa thường + khoảng trắng
    expect(s).toHaveLength(2);
    expect(s[0].vi).toBe("câu một");
    expect(s[0].at).toBe(NOW + 2);
  });

  it("câu rỗng → trả store cũ nguyên vẹn", () => {
    const s = addAsk([], "câu một", A, NOW);
    expect(addAsk(s, "   ", A, NOW)).toBe(s);
  });

  it("store không phải mảng → vẫn trả mảng", () => {
    expect(addAsk(null, "câu một", A, NOW)).toHaveLength(1);
  });

  it("giữ tối đa " + MAX_ASKS + " câu, cắt câu cũ nhất", () => {
    let s = [];
    for (let i = 0; i < MAX_ASKS + 5; i++) s = addAsk(s, "câu " + i, A, NOW + i);
    expect(s).toHaveLength(MAX_ASKS);
    expect(s[0].vi).toBe("câu " + (MAX_ASKS + 4));
    expect(s.some((x) => x.vi === "câu 0")).toBe(false);
  });
});

describe("recentAsks", () => {
  it("lấy n câu đầu", () => {
    let s = [];
    for (let i = 0; i < 6; i++) s = addAsk(s, "câu " + i, A, NOW + i);
    expect(recentAsks(s, 3).map((x) => x.vi)).toEqual(["câu 5", "câu 4", "câu 3"]);
  });

  it("store hỏng → rỗng", () => expect(recentAsks(null, 3)).toEqual([]));
});

describe("normVi", () => {
  it("bỏ hoa thường, gộp khoảng trắng", () => expect(normVi("  Cho  TÔI xin ")).toBe("cho tôi xin"));
});
```

- [ ] **Step 2: Chạy để chắc chắn nó ĐỎ**

Run: `cd /f/git/SRF && npx vitest run src/srs/ask.test.js`
Expected: FAIL — `Failed to resolve import "./ask.js"`.

- [ ] **Step 3: Viết `src/srs/ask.js` (chưa có `sanitizeAnswer` — Task 2 mới thêm)**

```js
// Hỏi đáp Việt→Anh (spec Phần 11): kho 20 câu hỏi gần nhất, KÈM LUÔN câu trả lời.
// Lưu kèm câu trả lời để mở lại câu cũ KHÔNG tốn một lượt gọi Claude nào.
//
// THUẦN trừ load/save; nhận `now` từ ngoài để test tất định. KHÔNG mutate tham số.

export const ASK_KEY = "srf-ask-v1";
export const MAX_ASKS = 20;

// Khoá so trùng: bỏ hoa thường + khoảng trắng thừa + chuẩn hoá Unicode.
// NFC bắt buộc vì tiếng Việt có dấu tổ hợp: "cà" gõ hai kiểu ra hai chuỗi byte khác nhau.
export function normVi(vi) {
  return String(vi || "").trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");
}

export function loadAsk() {
  try {
    const v = JSON.parse(localStorage.getItem(ASK_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveAsk(list) {
  try {
    localStorage.setItem(ASK_KEY, JSON.stringify(list));
  } catch {
    /* localStorage không khả dụng — bỏ qua, phiên vẫn chạy được */
  }
}

// Thêm một lần hỏi. Trả mảng MỚI, mới nhất đứng đầu, tối đa MAX_ASKS.
// Hỏi lại câu cũ → đẩy lên đầu + cập nhật câu trả lời, không nhân đôi.
export function addAsk(store = [], vi, answer, now = Date.now()) {
  const q = String(vi || "").trim();
  const list = Array.isArray(store) ? store : [];
  if (!q) return list;
  const key = normVi(q);
  const rest = list.filter((x) => normVi(x?.vi) !== key);
  return [{ vi: q, a: answer, at: now }, ...rest].slice(0, MAX_ASKS);
}

export function recentAsks(store = [], n = MAX_ASKS) {
  return (Array.isArray(store) ? store : []).slice(0, n);
}
```

Lưu ý: `addAsk(s, "   ", A, NOW)` phải trả về **chính** `s` (test dùng `toBe`). Đoạn `const list = Array.isArray(store) ? store : []` rồi `if (!q) return list` làm đúng điều đó khi `store` là mảng.

- [ ] **Step 4: Chạy lại, phải XANH**

Run: `cd /f/git/SRF && npx vitest run src/srs/ask.test.js`
Expected: PASS, 14 test.

- [ ] **Step 5: Chạy toàn bộ để chắc không vỡ gì**

Run: `cd /f/git/SRF && npx vitest run`
Expected: PASS — 177 test cũ + 14 mới = 191.

- [ ] **Step 6: Commit**

```bash
cd /f/git/SRF
git add src/srs/ask.js src/srs/ask.test.js
git commit -m "feat: ask history store, newest first, capped at 20

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `sanitizeAnswer` — chặn mọi hình thù lạ từ LLM

**Files:**
- Modify: `src/srs/ask.js`
- Modify: `src/srs/ask.test.js`

Lý do tách khỏi Task 1: đây là lớp phòng thủ duy nhất giữa LLM và giao diện. Giao diện sau đó không cần một câu `if` phòng thủ nào, nên nó phải được kiểm riêng và kiểm kỹ.

- [ ] **Step 1: Thêm test (sẽ đỏ)**

Sửa dòng import đầu file `src/srs/ask.test.js` thành:

```js
import { loadAsk, saveAsk, addAsk, recentAsks, sanitizeAnswer, normVi, ASK_KEY, MAX_ASKS } from "./ask.js";
```

Thêm vào cuối file:

```js
describe("sanitizeAnswer", () => {
  const full = {
    en: "  Could I get the bill?  ",
    ipa: "/kʊd aɪ ɡet ðə bɪl/",
    use: "Lịch sự.",
    say: "",
    alt: { en: "Check, please.", ipa: "/tʃek pliːz/", note: "thân mật" },
  };

  it("ép kiểu và cắt khoảng trắng", () => {
    expect(sanitizeAnswer(full)).toEqual({
      en: "Could I get the bill?",
      ipa: "/kʊd aɪ ɡet ðə bɪl/",
      use: "Lịch sự.",
      say: "",
      alt: { en: "Check, please.", ipa: "/tʃek pliːz/", note: "thân mật" },
    });
  });

  it("thiếu en → null (không có gì để hiện)", () => {
    expect(sanitizeAnswer({ ipa: "/x/", use: "abc" })).toBeNull();
    expect(sanitizeAnswer({ en: "   " })).toBeNull();
  });

  it("không phải object → null", () => {
    expect(sanitizeAnswer(null)).toBeNull();
    expect(sanitizeAnswer("Could I get the bill?")).toBeNull();
    expect(sanitizeAnswer([{ en: "x" }])).toBeNull();
  });

  it("trường thiếu → chuỗi rỗng, không phải undefined", () => {
    expect(sanitizeAnswer({ en: "Hi." })).toEqual({ en: "Hi.", ipa: "", use: "", say: "", alt: null });
  });

  it("trường là số / object → chuỗi rỗng", () => {
    const r = sanitizeAnswer({ en: "Hi.", ipa: 42, use: { a: 1 }, say: ["x"] });
    expect(r).toEqual({ en: "Hi.", ipa: "", use: "", say: "", alt: null });
  });

  it("alt là mảng / chuỗi / thiếu en → alt = null", () => {
    expect(sanitizeAnswer({ en: "Hi.", alt: ["Hey."] }).alt).toBeNull();
    expect(sanitizeAnswer({ en: "Hi.", alt: "Hey." }).alt).toBeNull();
    expect(sanitizeAnswer({ en: "Hi.", alt: { ipa: "/heɪ/" } }).alt).toBeNull();
  });

  it("alt chỉ có en → ipa/note rỗng", () => {
    expect(sanitizeAnswer({ en: "Hi.", alt: { en: "Hey." } }).alt).toEqual({ en: "Hey.", ipa: "", note: "" });
  });

  it("KHÔNG mutate tham số", () => {
    const before = JSON.stringify(full);
    sanitizeAnswer(full);
    expect(JSON.stringify(full)).toBe(before);
  });
});

describe("addAsk + sanitizeAnswer", () => {
  it("câu trả lời không dùng được → trả store cũ nguyên vẹn", () => {
    const s = addAsk([], "câu một", { en: "Hi." }, NOW);
    expect(addAsk(s, "câu hai", { ipa: "/x/" }, NOW + 1)).toBe(s);
    expect(addAsk(s, "câu hai", null, NOW + 1)).toBe(s);
  });

  it("lưu bản ĐÃ làm sạch, không lưu bản thô", () => {
    const s = addAsk([], "câu một", { en: " Hi. ", ipa: 9 }, NOW);
    expect(s[0].a).toEqual({ en: "Hi.", ipa: "", use: "", say: "", alt: null });
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn nó ĐỎ**

Run: `cd /f/git/SRF && npx vitest run src/srs/ask.test.js`
Expected: FAIL — `sanitizeAnswer is not a function`.

- [ ] **Step 3: Thêm `sanitizeAnswer` vào `src/srs/ask.js`**

Chèn NGAY TRƯỚC `export function addAsk`:

```js
// Ép câu trả lời của LLM về đúng khuôn. Đây là lớp phòng thủ DUY NHẤT giữa Claude và giao diện —
// nhờ nó mà AskSheet không cần một câu `if` kiểm kiểu nào.
// Không có `en` thì cả câu trả lời vô dụng → null, gọi chỗ khác biết mà báo lỗi.
export function sanitizeAnswer(raw) {
  const s = (v) => (typeof v === "string" ? v.trim() : "");
  const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);
  const o = obj(raw);
  if (!o) return null;
  const en = s(o.en);
  if (!en) return null;
  const a = obj(o.alt);
  const altEn = a ? s(a.en) : "";
  return {
    en,
    ipa: s(o.ipa),
    use: s(o.use),
    say: s(o.say),
    alt: altEn ? { en: altEn, ipa: s(a.ipa), note: s(a.note) } : null,
  };
}
```

Và sửa `addAsk` để nó làm sạch trước khi lưu — thay thân hàm hiện tại bằng:

```js
export function addAsk(store = [], vi, answer, now = Date.now()) {
  const q = String(vi || "").trim();
  const list = Array.isArray(store) ? store : [];
  const a = sanitizeAnswer(answer);
  if (!q || !a) return list;
  const key = normVi(q);
  const rest = list.filter((x) => normVi(x?.vi) !== key);
  return [{ vi: q, a, at: now }, ...rest].slice(0, MAX_ASKS);
}
```

**Cảnh báo:** test cũ ở Task 1 dùng hằng `A` đã đúng khuôn (`en` + `ipa` + `use` + `say` + `alt: null`) nên vẫn pass sau thay đổi này. Nếu một test cũ đỏ, đọc kỹ trước khi sửa test — có thể `sanitizeAnswer` mới là thứ sai.

- [ ] **Step 4: Chạy lại, phải XANH**

Run: `cd /f/git/SRF && npx vitest run src/srs/ask.test.js`
Expected: PASS, 24 test.

- [ ] **Step 5: Toàn bộ test**

Run: `cd /f/git/SRF && npx vitest run`
Expected: PASS, 201 test.

- [ ] **Step 6: Commit**

```bash
cd /f/git/SRF
git add src/srs/ask.js src/srs/ask.test.js
git commit -m "feat: sanitizeAnswer, the only guard between Claude and the UI

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Route proxy `/ask`

**Files:**
- Modify: `server/proxy.mjs` — thêm `handleAsk` cạnh `handleIpa`, thêm **một dòng** vào `ROUTES`.

- [ ] **Step 1: Xem khối `ROUTES` hiện tại BẰNG MẮT trước khi sửa**

Run: `cd /f/git/SRF && sed -n '/^const ROUTES = {/,/^};/p' server/proxy.mjs`

Ghi lại chính xác những route đang có. **Tuyệt đối không dán đè cả khối bằng trí nhớ.** Lần trước đúng chỗ này suýt xoá mất `/coach` vì dùng một ảnh chụp cũ.

- [ ] **Step 2: Thêm `handleAsk` ngay SAU hàm `handleIpa`**

Tìm cuối hàm `handleIpa` (kết thúc bằng `return { ipa: text.trim() };` rồi `}`), chèn sau nó:

```js
// Việt → Anh (spec Phần 11). Ngược chiều với /translate (Anh → Việt, dùng khi bấm vào từ lúc nói).
// Trả JSON cứng để giao diện không phải đoán; srs/ask.js:sanitizeAnswer làm sạch lần nữa ở client.
async function handleAsk(body) {
  const { vi = "" } = body;
  const out = await callClaude({
    maxTokens: 300,
    system:
      "Bạn là gia sư tiếng Anh cho người Việt. Người học đưa một câu TIẾNG VIỆT, bạn cho biết người " +
      "bản xứ THẬT SỰ nói câu đó thế nào. " +
      'CHỈ trả JSON: {"en":"..","ipa":"/../","use":"..","say":"..","alt":{"en":"..","ipa":"/../","note":".."}}. ' +
      "en = ĐÚNG MỘT câu tự nhiên nhất người bản xứ dùng — KHÔNG dịch sát từng chữ. " +
      "ipa = IPA General American, đặt trong /.../. " +
      "use = tối đa 2 câu TIẾNG VIỆT: trang trọng hay thân mật, dùng ở đâu, khác biệt Anh–Mỹ nếu có. " +
      "say = mẹo phát âm TIẾNG VIỆT, CHỈ khi có bẫy thật (chữ câm, trọng âm hay đặt sai, âm người Việt " +
      'hay nuốt). Không có bẫy thì trả "" — thà bỏ trống còn hơn bịa ra mẹo vô nghĩa. ' +
      "alt = ĐÚNG MỘT cách nói khác, ở mức trang trọng KHÁC với en; note ≤ 5 từ tiếng Việt. " +
      "Người học lỡ gõ tiếng Anh → VẪN trả lời: coi như họ muốn kiểm câu đó, sửa lại cho tự nhiên. " +
      "Câu tiếng Việt mơ hồ → chọn cách hiểu phổ biến nhất VÀ nói rõ ngữ cảnh đã chọn trong use. " +
      "KHÔNG markdown, KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: String(vi).slice(0, 300) }],
  });
  const o = extractJsonObject(out) || {};
  return { en: "", ipa: "", use: "", say: "", alt: null, ...o };
}
```

- [ ] **Step 3: Thêm ĐÚNG MỘT dòng vào `ROUTES`**

Ngay sau dòng `"/ipa": handleIpa,` thêm:

```js
  "/ask": handleAsk,
```

- [ ] **Step 4: Kiểm không route nào biến mất**

Run:
```bash
cd /f/git/SRF && sed -n '/^const ROUTES = {/,/^};/p' server/proxy.mjs
```
Expected: đủ **12** dòng — `/`, `/scenario`, `/mine`, `/story`, `/coach`, `/assess`, `/summary`, `/translate`, `/ipa`, `/ask`, `/patterns`, `/tutor`. Đối chiếu với danh sách ghi ở Step 1 — phải là danh sách cũ **cộng đúng một dòng**, không thiếu dòng nào.

Run: `cd /f/git/SRF && node --check server/proxy.mjs && echo "cú pháp OK"`
Expected: `cú pháp OK`

- [ ] **Step 5: Gọi THẬT `/ask` trên proxy đang chạy, 3 câu**

Proxy live: `https://english.forbible.org/api/`. Token ở biến môi trường của proxy, client chỉ cần header xác thực như các route khác — xem `src/ai/auth.js` để biết header đúng.

Chạy bằng Node (curl với `-w` trên máy này lỗi 43, đừng dùng):

```bash
cd /f/git/SRF && node -e '
const cases = [
  "cho tôi xin hoá đơn",
  "cho tôi xin",                       // mơ hồ CỐ Ý
  "I want go to school"                // gõ nhầm tiếng Anh CỐ Ý
];
(async () => {
  for (const vi of cases) {
    const t = Date.now();
    const r = await fetch("https://english.forbible.org/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vi }),
    });
    console.log("\n=== " + vi + " === " + r.status + " " + (Date.now() - t) + "ms");
    console.log(JSON.stringify(await r.json(), null, 2));
  }
})();
'
```

**Lưu ý:** proxy phải được deploy lại thì route mới mới tồn tại. Nếu nhận `404`, chạy `bash scripts/deploy.sh` trước rồi thử lại. Nếu nhận `401`, token hết hạn → xem `TODO.md` mục Known Issues.

Kiểm bằng mắt, mỗi câu:
- `en` là **một** câu, tự nhiên, không phải dịch máy sát chữ.
- `ipa` nằm trong `/.../`.
- `use` là tiếng Việt, ≤ 2 câu.
- `say` **rỗng** với câu không có bẫy phát âm — nếu cả 3 câu đều có `say` dài dòng thì prompt đang bịa, phải siết lại.
- Câu mơ hồ: `use` phải nói rõ đã chọn ngữ cảnh nào.
- Câu gõ nhầm tiếng Anh: phải trả câu đã sửa (`I want to go to school.`), **không** báo lỗi.

- [ ] **Step 6: Commit**

```bash
cd /f/git/SRF
git add server/proxy.mjs
git commit -m "feat: proxy route /ask for Vietnamese to English lookup

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Client `src/ai/ask.js`

**Files:**
- Create: `src/ai/ask.js`

Không có test tự động: file này chỉ là `fetch`, kiểm nó nghĩa là giả lập mạng — tốn công hơn giá trị. Nó được kiểm thật ở Task 9 trong trình duyệt.

- [ ] **Step 1: Viết file**

```js
// Client gọi proxy /ask → Việt sang Anh (spec Phần 11). Không token ở client (C7).
// Trả JSON THÔ; làm sạch bằng srs/ask.js:sanitizeAnswer ở nơi gọi.
import { authHeaders } from "./auth.js";

const URL = import.meta.env.VITE_PROXY_URL;
// 20s. Whisper hồi trước KHÔNG có timeout nên khi máy chủ nghẹn, người dùng ngồi nhìn
// "Đang nghe bạn nói…" vĩnh viễn mà không biết chuyện gì. Đừng lặp lại.
const TIMEOUT_MS = 20_000;

export async function askEnglish(vi) {
  if (!URL) throw new Error("Chưa cấu hình VITE_PROXY_URL");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(URL.replace(/\/$/, "") + "/ask", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ vi }),
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

- [ ] **Step 2: Build phải sạch**

Run: `cd /f/git/SRF && npx vite build`
Expected: build xong, không lỗi import.

- [ ] **Step 3: Commit**

```bash
cd /f/git/SRF
git add src/ai/ask.js
git commit -m "feat: ask client with 20s abort timeout

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: CSS — nút nổi, tấm trượt, chip

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Nới đáy `.screen`**

Tìm khối `.screen {` (khoảng dòng 198). Đổi dòng `padding` hiện tại:

```css
  padding: 22px var(--gutter) 34px;
```

thành:

```css
  /* Đáy 90px chừa chỗ cho nút hỏi đáp nổi (48px + lề) — sửa MỘT chỗ, đúng cho mọi màn. */
  padding: 22px var(--gutter) 90px;
```

- [ ] **Step 2: Thêm CSS mới vào CUỐI `src/styles.css`**

```css
/* ── Hỏi đáp Việt→Anh (Phần 11) ───────────────────────────── */
.fab {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 60;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: var(--grad);
  color: var(--lime-ink);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 10px 28px -8px rgba(0, 0, 0, 0.85);
}
.fab:active { transform: scale(0.94); }

/* Tấm trượt: dính đáy trên điện thoại (ngón cái với tới), canh giữa trên màn rộng. */
.sheet-back {
  position: fixed; inset: 0; z-index: 80;
  background: rgba(4, 6, 8, 0.72);
  backdrop-filter: blur(3px);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0;
}
.sheet-card {
  width: 100%; max-width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px;
  background: var(--surface);
  border: 1px solid var(--line-hot);
  border-radius: var(--radius) var(--radius) 0 0;
  padding: 18px var(--gutter) calc(20px + env(safe-area-inset-bottom, 0px));
}
@media (min-width: 560px) {
  .sheet-back { align-items: center; padding: 18px; }
  .sheet-card { border-radius: var(--radius); }
}

.ask-en {
  font-family: var(--font-display);
  /* 1.25 chứ không 1.1: dấu tiếng Việt ở dòng dưới bị cắt mất chân ở 1.1 (đã dính một lần). */
  font-size: 24px; line-height: 1.25;
  margin: 0;
}
.ask-ipa { color: var(--mint); font-size: 15px; margin: 4px 0 0; }
.ask-alt {
  border-top: 1px solid var(--line);
  padding-top: 10px; margin-top: 2px;
}

.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  font: inherit; font-size: 13px;
  color: var(--text2);
  background: var(--ink-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 12px;          /* đủ 44px vùng chạm khi tính cả lề dòng */
  cursor: pointer;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.chip:hover { border-color: var(--line-hot); color: var(--text); }
```

- [ ] **Step 3: Build phải sạch**

Run: `cd /f/git/SRF && npx vite build`
Expected: build xong, không cảnh báo CSS.

- [ ] **Step 4: Commit**

```bash
cd /f/git/SRF
git add src/styles.css
git commit -m "style: floating button, bottom sheet and chips for ask feature

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `AskSheet.jsx` — chỉ vẽ

**Files:**
- Create: `src/components/AskSheet.jsx`

Ranh giới cố ý: component này **không biết gì về mạng và localStorage**. Mọi thứ vào qua props. Nhờ vậy Task 7 có thể thay cách lấy dữ liệu mà không đụng một dòng giao diện nào.

- [ ] **Step 1: Viết file**

```jsx
// Tấm trượt hỏi đáp Việt→Anh (spec Phần 11). CHỈ VẼ — không mạng, không localStorage.
//
// C10 (nói là bắt buộc): ô nhập ở đây gõ TIẾNG VIỆT để đặt câu hỏi, không phải gõ tiếng Anh để né
// mở miệng — cùng lý do AddWordModal được phép có ô chữ. Ranh giới này mỏng nên được giữ bằng CẤU
// TRÚC, không bằng lời khuyên: KHÔNG có đường nào từ ô nhập ghi ra một attempt. Attempt chỉ sinh
// từ SpeakCheck bên dưới. Đừng thêm đường tắt nào.
import { useState } from "react";
import SpeakCheck from "./SpeakCheck.jsx";
import { speak } from "../utils/tts.js";

function Line({ en, ipa, big }) {
  return (
    <div>
      <p className={big ? "ask-en" : ""} style={big ? undefined : { margin: 0, fontSize: 17 }}>
        {en}{" "}
        <button className="btn-link" onClick={() => speak(en)} aria-label={"Nghe: " + en}>🔊</button>
      </p>
      {ipa && <p className="ask-ipa">{ipa}</p>}
    </div>
  );
}

export default function AskSheet({
  q, onQ, onSubmit, busy, err, answer, recents, onPick, onSave, saved, onAttempt, onClose,
}) {
  const [speaking, setSpeaking] = useState(false);
  const ok = !!q.trim();

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Câu này tiếng Anh nói sao?</div>

        <div className="inp-row">
          <input
            className="inp"
            autoFocus
            placeholder="gõ câu tiếng Việt…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ok && !busy && onSubmit()}
          />
          <button className="btn btn-sm" disabled={!ok || busy} onClick={onSubmit}>
            {busy ? "…" : "→"}
          </button>
        </div>

        {busy && <p className="muted center pulse">Đang tìm cách nói tự nhiên nhất…</p>}

        {err && (
          <div className="err">
            {err}
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-sm" onClick={onSubmit}>Thử lại</button>
            </div>
          </div>
        )}

        {!busy && !err && !answer && recents.length > 0 && (
          <>
            <p className="muted small" style={{ margin: "4px 0 0" }}>Đã hỏi gần đây</p>
            <div className="chips">
              {recents.map((r) => (
                <button key={r.at} className="chip" onClick={() => onPick(r)} title={r.vi}>{r.vi}</button>
              ))}
            </div>
          </>
        )}

        {answer && !busy && (
          <>
            <div className="card">
              <Line en={answer.en} ipa={answer.ipa} big />
              {answer.use && <p className="muted small" style={{ marginBottom: 0 }}>{answer.use}</p>}
              {answer.say && <p className="small" style={{ color: "var(--ember)", margin: "6px 0 0" }}>🗣️ {answer.say}</p>}
              {answer.alt && (
                <div className="ask-alt">
                  <p className="muted small" style={{ margin: "0 0 4px" }}>
                    Nói khác{answer.alt.note ? ` · ${answer.alt.note}` : ""}
                  </p>
                  <Line en={answer.alt.en} ipa={answer.alt.ipa} />
                </div>
              )}
            </div>

            {speaking ? (
              <SpeakCheck
                key={answer.en}
                target={answer.en}
                kind="ask"
                onAttempt={onAttempt}
                prompt={<p className="muted small center">Nói lại câu trên.</p>}
              />
            ) : (
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => setSpeaking(true)}>🎙️ Nói thử</button>
                <button className="btn" disabled={saved} onClick={onSave}>
                  {saved ? "✓ Đã lưu" : "⭐ Lưu vào ôn tập"}
                </button>
              </div>
            )}

            {saved && (
              <p className="muted small center" style={{ margin: 0 }}>
                Câu này sẽ quay lại ở <b>ôn nhanh</b> những ngày tới.
              </p>
            )}
          </>
        )}

        <button className="btn" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Kiểm các class dùng trong file đều CÓ THẬT**

Run:
```bash
cd /f/git/SRF && for c in eyebrow inp-row inp btn-sm btn-link err chips chip card ask-en ask-ipa ask-alt btn-row btn-primary pulse center muted small sheet-back sheet-card; do
  n=$(grep -c "\.$c\b" src/styles.css src/legacy.css | awk -F: '{s+=$2} END {print s}')
  n=${n:-0}
  [ "$n" -eq 0 ] && echo "THIẾU: .$c"
done; echo "kiểm xong"
```
Expected: chỉ in `kiểm xong`. Class nào bị báo THIẾU thì phải thêm vào `src/styles.css` trước khi đi tiếp — đừng để component trông vỡ.

- [ ] **Step 3: Build sạch**

Run: `cd /f/git/SRF && npx vite build`
Expected: build xong.

- [ ] **Step 4: Commit**

```bash
cd /f/git/SRF
git add src/components/AskSheet.jsx
git commit -m "feat: AskSheet, presentational only, no network or storage

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `AskFab.jsx` — nút nổi + nối mạng/kho

**Files:**
- Create: `src/components/AskFab.jsx`

- [ ] **Step 1: Viết file**

```jsx
// Nút hỏi đáp nổi + trạng thái của tấm trượt (spec Phần 11).
// Tách khỏi AskSheet để AskSheet thuần vẽ: file này giữ mọi thứ "bẩn" — mạng, localStorage, lỗi.
import { useCallback, useState } from "react";
import AskSheet from "./AskSheet.jsx";
import { askEnglish } from "../ai/ask.js";
import { addAsk, loadAsk, recentAsks, sanitizeAnswer, saveAsk } from "../srs/ask.js";

export default function AskFab({ onAddWord, onAttempt }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [answer, setAnswer] = useState(null);
  // Câu tiếng Việt ĐÃ SINH RA `answer`, không phải câu đang gõ trong ô. Hai thứ này lệch nhau khi
  // người học gõ câu mới rồi bấm ⭐ mà chưa gửi — lấy `q` lúc đó sẽ lưu sai nghĩa cho câu cũ.
  const [askedVi, setAskedVi] = useState("");
  const [saved, setSaved] = useState(false);
  const [store, setStore] = useState(loadAsk);

  const reset = () => {
    setQ(""); setAnswer(null); setAskedVi(""); setErr(""); setSaved(false); setBusy(false);
  };

  const submit = useCallback(() => {
    const vi = q.trim();
    if (!vi) return;
    setBusy(true); setErr(""); setAnswer(null); setSaved(false);
    askEnglish(vi)
      .then((raw) => {
        const a = sanitizeAnswer(raw);
        if (!a) throw new Error("Không đọc được câu trả lời. Thử lại nhé.");
        setAnswer(a);
        setAskedVi(vi);
        setStore((prev) => { const next = addAsk(prev, vi, a, Date.now()); saveAsk(next); return next; });
      })
      .catch((e) => {
        // AbortController báo lỗi tên "AbortError" — dịch sang tiếng Việt người dùng hiểu được,
        // đừng để nguyên chuỗi tiếng Anh của trình duyệt.
        const msg = e?.name === "AbortError"
          ? "Máy chủ không trả lời (quá 20 giây)."
          : "Lỗi: " + String(e?.message || e);
        setErr(msg);
      })
      .finally(() => setBusy(false));
  }, [q]);

  // Mở lại câu cũ: câu trả lời đã nằm sẵn trong kho nên KHÔNG gọi mạng.
  const pick = useCallback((r) => {
    setQ(r.vi); setAnswer(r.a); setAskedVi(r.vi); setErr(""); setSaved(false);
  }, []);

  // Lưu vào từ vựng của NGÀY đang học: câu tiếng Anh làm "từ", câu tiếng Việt làm nghĩa.
  // myWordItems dựng variants [{ vi, en }] nên lúc ôn sẽ hỏi ĐÚNG CHIỀU Việt→Anh.
  const save = useCallback(() => {
    if (!answer) return;
    onAddWord?.({ w: answer.en, m: askedVi, en: answer.en });
    setSaved(true);
  }, [answer, askedVi, onAddWord]);

  if (!open) {
    return (
      <button className="fab" aria-label="Hỏi câu này tiếng Anh nói sao" onClick={() => setOpen(true)}>💬</button>
    );
  }

  return (
    <AskSheet
      q={q}
      onQ={setQ}
      onSubmit={submit}
      busy={busy}
      err={err}
      answer={answer}
      recents={recentAsks(store, 8)}
      onPick={pick}
      onSave={save}
      saved={saved}
      onAttempt={onAttempt}
      onClose={() => { setOpen(false); reset(); }}
    />
  );
}
```

- [ ] **Step 2: Build sạch**

Run: `cd /f/git/SRF && npx vite build`
Expected: build xong.

- [ ] **Step 3: Commit**

```bash
cd /f/git/SRF
git add src/components/AskFab.jsx
git commit -m "feat: AskFab wires ask sheet to proxy, history store and addWord

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Gắn FAB lên MỌI màn (`App.jsx`)

**Files:**
- Modify: `src/App.jsx` — chỉ khối `App` + dòng đầu `AppMain`.

Cách làm cố ý tránh việc gom các `return` sớm của `AppMain` vào một hàm lồng: làm thế phải thụt lề lại ~130 dòng, diff to và dễ lọt lỗi. Thay vào đó chèn một tầng `AppShell` gọi `useLesson()` rồi truyền `L` xuống — **6 dòng, không thụt lề lại dòng nào.**

- [ ] **Step 1: Thêm import**

Sau dòng `import WarmupTalk from "./components/WarmupTalk.jsx";` thêm:

```js
import AskFab from "./components/AskFab.jsx";
```

- [ ] **Step 2: Chèn tầng `AppShell`**

Thay khối:

```jsx
export default function App() {
  const [authed, setAuthed] = useState(isAuthed);
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <AppMain />;
}

function AppMain() {
  const L = useLesson();
```

bằng:

```jsx
export default function App() {
  const [authed, setAuthed] = useState(isAuthed);
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <AppShell />;
}

// Tầng này tồn tại để nút hỏi đáp có mặt ở MỌI màn mà không phải sửa 15 chỗ `return` trong AppMain.
// `useLesson()` chuyển lên đây và truyền xuống — gọi hook ở hai nơi là hai kho trạng thái khác nhau.
function AppShell() {
  const L = useLesson();
  return (
    <>
      <AppMain L={L} />
      <AskFab onAddWord={L.addWord} onAttempt={L.attempt} />
    </>
  );
}

function AppMain({ L }) {
```

**Quan trọng:** dòng `const L = useLesson();` cũ trong `AppMain` phải **bị xoá** (nó đã chuyển lên `AppShell`). Mọi hook còn lại của `AppMain` (`useState` cho `view`, 4 cái `useMemo`) giữ NGUYÊN VỊ TRÍ — vẫn ở đầu hàm, trước mọi `return`. Đẩy hook xuống dưới một `return` có điều kiện là tái phạm đúng lỗi Rules of Hooks đã sửa ở Phần 10 (app crash khi chuyển từ nhịp nói sang màn đóng ngày).

- [ ] **Step 3: Kiểm `useLesson` chỉ còn được gọi MỘT lần**

Run: `cd /f/git/SRF && grep -n "useLesson()" src/App.jsx`
Expected: đúng **một** dòng, nằm trong `AppShell`.

- [ ] **Step 4: Build + toàn bộ test**

Run: `cd /f/git/SRF && npx vite build && npx vitest run`
Expected: build xong, 201 test PASS.

- [ ] **Step 5: Commit**

```bash
cd /f/git/SRF
git add src/App.jsx
git commit -m "feat: mount ask button on every screen via AppShell layer

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Nghiệm thu trong trình duyệt

**Files:** không sửa file nào. Đây là task kiểm chứng.

Dùng skill `browser-automation` (patchright). Chạy trên bản build local (`npx vite preview`) hoặc bản live sau khi deploy — nêu rõ đã chạy trên cái nào khi báo kết quả.

- [ ] **Step 1: Deploy trước (route `/ask` phải có thật)**

Run: `cd /f/git/SRF && bash scripts/deploy.sh`
Expected: health check xanh. Nếu `502`, script đã có vòng lặp thử lại — nếu vẫn hỏng thì **kiểm máy chủ cura-dev trước khi nghi code** (host này hay treo RCU / mất DNS trong container).

- [ ] **Step 2: FAB có mặt ở màn chờ VÀ giữa bài**

Mở `https://english.forbible.org/`, đăng nhập, chụp màn chờ. Xác nhận thấy nút 💬 góc dưới phải và nó **không đè lên** nút "Bắt đầu học". Bấm vào bài học, sang nhịp bất kỳ, xác nhận nút vẫn còn.

Đo bằng script thay vì nhìn ảnh:
```js
const fab = document.querySelector(".fab").getBoundingClientRect();
const hit = [...document.querySelectorAll(".btn, .chip")]
  .map((b) => b.getBoundingClientRect())
  .filter((r) => r.width && !(r.right < fab.left || r.left > fab.right || r.bottom < fab.top || r.top > fab.bottom));
({ fabOnScreen: fab.width > 0, deLen: hit.length });
```
Expected: `{ fabOnScreen: true, deLen: 0 }`.

- [ ] **Step 3: Hỏi một câu thật**

Bấm 💬, gõ `cho tôi xin hoá đơn`, Enter. Chờ kết quả.
Expected: hiện câu tiếng Anh + IPA + cách dùng. Bấm 🔊 nghe được (Kokoro hoặc Web Speech).

- [ ] **Step 4: Lưu và xác minh ĐÚNG CHIỀU trong localStorage**

Bấm ⭐, rồi chạy:
```js
const my = JSON.parse(localStorage.getItem("srf-mywords-v1") || "{}");
const day = Object.keys(my).sort((a, b) => b - a)[0];
({ day, entry: my[day]?.[my[day].length - 1] });
```
Expected: `entry.w` là câu **tiếng Anh**, `entry.m` là câu **tiếng Việt** đã gõ, `entry.en` = `entry.w`.

Đây là điểm dễ sai nhất của cả tính năng: lẫn `w` với `m` thì hôm sau nhịp ôn sẽ hỏi ngược chiều (đưa tiếng Anh, bắt nói tiếng Việt) — vô dụng. Phải kiểm bằng dữ liệu, không nhìn giao diện.

- [ ] **Step 5: Chip mở lại KHÔNG gọi mạng**

Đóng tấm trượt, mở lại, bấm chip vừa tạo trong khi theo dõi network.
Expected: kết quả hiện ra, **0 request** tới `/ask`.

- [ ] **Step 6: Lỗi mạng không làm treo**

Chặn `**/ask` trả `500`, hỏi một câu.
Expected: hiện câu lỗi tiếng Việt + nút "Thử lại" trong vòng vài giây, app không đơ.

- [ ] **Step 7: Console sạch**

Expected: 0 lỗi console suốt cả luồng trên.

- [ ] **Step 8: Ghi kết quả**

Không có gì để commit. Chép kết quả đo được vào phần báo cáo cho người dùng — **số liệu thật, không phải "có vẻ ổn"**.

---

### Task 10: Tài liệu + merge

**Files:**
- Modify: `CLAUDE.md`
- Modify: `Lo_trinh_Spaced_Repetition_Flashcard.md`
- Modify: `TODO.md`

- [ ] **Step 1: Ghi ngoại lệ C10 vào `CLAUDE.md`**

Tìm mục **C10** và thêm ngay dưới nó:

```markdown
> **Ngoại lệ có điều kiện (Phần 11 — hỏi đáp).** `AskSheet` có ô nhập chữ, nhưng ô đó nhận
> **tiếng Việt** để ĐẶT CÂU HỎI, không phải tiếng Anh để thay cho việc nói — cùng lý do
> `AddWordModal` được phép có ô chữ. Ranh giới này được giữ bằng CẤU TRÚC chứ không bằng lời
> khuyên: không tồn tại đường nào từ ô nhập ghi ra một attempt; attempt chỉ sinh từ `SpeakCheck`.
> Thêm bất kỳ đường tắt nào từ chữ gõ sang attempt là vi phạm C10.
```

Thêm `srs/ask.js` vào danh sách cấu trúc thư mục trong `CLAUDE.md` (cạnh `srs/tutor.js`).

- [ ] **Step 2: Thêm Phần 11 vào spec chính**

Vào cuối `Lo_trinh_Spaced_Repetition_Flashcard.md`, thêm mục **Phần 11 — Hỏi đáp Việt→Anh** tóm tắt trong ~15 dòng: lý do tồn tại, khuôn JSON của `/ask`, kho `srf-ask-v1`, đường `⭐ → addWord → myWords → itemsFor → nhịp ôn (chiều Việt→Anh)`, và trỏ sang file thiết kế đầy đủ `docs/superpowers/specs/2026-09-23-hoi-dap-viet-anh-design.md`.

Ghi kèm **những gì đã đo thật ở Task 3 và Task 9** — nhất là chuyện `say` có bỏ trống đúng lúc không. Nếu phải sửa prompt sau khi gọi thật, ghi lại cả lý do, như §10.7b đã làm cho Phần 10.

- [ ] **Step 3: Cập nhật `TODO.md`**

Thêm mục mới sau phần "Phần 10":

```markdown
## Phần 11 — Hỏi đáp Việt→Anh

> Kế hoạch: [`docs/superpowers/plans/2026-09-23-hoi-dap-viet-anh.md`](docs/superpowers/plans/2026-09-23-hoi-dap-viet-anh.md)

- [x] **A1–A2** `srs/ask.js` + test (kho 20 câu, `sanitizeAnswer`)
- [x] **A3–A4** route proxy `/ask` + client `ai/ask.js` (timeout 20s)
- [x] **A5–A7** CSS + `AskSheet` (thuần vẽ) + `AskFab` (mạng/kho)
- [x] **A8** gắn FAB mọi màn qua tầng `AppShell`
- [x] **A9** nghiệm thu trình duyệt
- [x] **A10** tài liệu + merge
```

- [ ] **Step 4: Chạy lại toàn bộ test lần cuối**

Run: `cd /f/git/SRF && npx vitest run`
Expected: 201 PASS.

- [ ] **Step 5: Commit + merge vào `main`**

```bash
cd /f/git/SRF
git add CLAUDE.md Lo_trinh_Spaced_Repetition_Flashcard.md TODO.md
git commit -m "docs: record Part 11 and the conditional C10 exception

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git checkout main
git merge --no-ff hoi-dap-phan-11 -m "Merge: hoi dap Viet-Anh (Phan 11)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
npx vitest run
bash scripts/deploy.sh
git push origin main
```

**Đừng dùng dấu backtick trong thông điệp commit.** Trong Git Bash nó bị chạy như lệnh và ăn mất chữ — đã dính hai lần trong dự án này.

---

## Bẫy đã biết của dự án này

Đọc trước khi bắt đầu, đây là những chỗ đã làm mất thời gian thật:

1. **`ROUTES` trong `server/proxy.mjs`** — chỉ thêm dòng. Dán đè cả khối từ trí nhớ là xoá route đang chạy.
2. **Hook trong `AppMain`** phải ở trên mọi `return` có điều kiện. Vi phạm → crash đúng lúc chuyển nhịp.
3. **Heredoc tiếng Việt dài trong Git Bash** hay hỏng — file lớn thì dùng công cụ Write, đừng `cat <<EOF`.
4. **Backtick trong `git commit -m "…"`** bị chạy như lệnh. Dùng `git commit -F` hoặc tránh backtick.
5. **`line-height: 1.1`** cắt mất dấu tiếng Việt. Tối thiểu 1.2.
6. **`grep -c … || echo 0`** in ra hai số. Dùng `n=$(...); n=${n:-0}`.
7. **`curl -w` với api.anthropic.com trên máy này lỗi 43** — dùng `fetch` của Node.
8. **`docker compose restart proxy` KHÔNG đủ** sau khi đổi `.env` — phải `--force-recreate`.
9. **cura-dev hay treo** — gặp lỗi mạng khi deploy thì kiểm host trước khi nghi code.
