# Lịch ôn từ vựng (Spaced Repetition) — Thuật toán & Lộ trình cho Claude Code

> **Mục tiêu:** xây app flashcard **từ vựng theo chủ đề** (hiện 150 từ / 10 chủ đề trong `vocab.js`, mục tiêu ~1000) để **tự sắp lịch ôn** theo thuật toán **SM-2**, **lưu tiến độ** qua các lần mở app, và cho phép **nạp thêm từ vựng ngay trong app** (không phải sửa file mỗi lần).
>
> **App dùng Claude API.** Vai trò của Claude: **bộ não hội thoại** cho tính năng *luyện nói* — vòng lặp **Whisper (nghe → chữ) → Claude (hiểu & trả lời) → Web Speech API (đọc to)**. Claude là khâu "suy nghĩ và trả lời" ở giữa. Chi tiết ở **Phần 3**.
>
> Từ bản nâng cấp, Claude còn là **trợ lý dữ liệu học**: nạp từ vựng từ văn bản thật (*mining*), sinh câu/mini-story luyện đọc-nghe — xem **Phần 5 (Tầng học hiệu quả)**. **Ràng buộc duy nhất còn lại:** Claude **KHÔNG** tính `q`/lịch SM-2 — `q` luôn do người học tự chấm, lịch luôn do `srs/sm2.js` thuần tính.
> Tài liệu gồm 2 phần: (1) đặc tả thuật toán, (2) lộ trình triển khai từng bước để đưa cho Claude Code.

---

## Phần 1 — Thuật toán lịch ôn (SM-2)

### 1.1. Trạng thái lưu cho mỗi thẻ (SR state)

| Trường | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `id` | string | — | Khóa duy nhất, vd `"Con người & Tính cách::reliable"` (= `c + "::" + v`) |
| `ef` | number | `2.5` | Ease factor — độ "dễ"; càng cao, khoảng cách ôn giãn càng nhanh (tối thiểu `1.3`) |
| `reps` | number | `0` | Số lần trả lời đúng liên tiếp |
| `interval` | number | `0` | Khoảng cách đến lần ôn kế (số **ngày**) |
| `due` | timestamp | now | Thời điểm thẻ đến hạn ôn (ms) |
| `lapses` | number | `0` | Số lần quên (đếm để biết thẻ khó) |
| `lastReviewed` | timestamp | — | Lần ôn gần nhất |
| `seen` | boolean | `false` | Đã từng học chưa (`false` = thẻ mới) |

Thẻ chưa có state → coi là **thẻ mới** (`seen = false`, luôn sẵn sàng để học).

### 1.2. Thang đánh giá (4 nút sau khi lật thẻ)

| Nút hiển thị | quality `q` | Ý nghĩa |
|---|---|---|
| **Chưa nhớ** | `2` | Quên → học lại từ đầu |
| **Khó** | `3` | Nhớ được nhưng chật vật |
| **Tốt** | `4` | Nhớ bình thường |
| **Dễ** | `5` | Nhớ ngay, quá dễ |

> Có thể rút còn **3 nút** (Chưa nhớ / Nhớ / Dễ → `q = 2 / 4 / 5`) cho đơn giản. Công thức bên dưới dùng chung.

### 1.3. Hàm cập nhật lịch (core)

```js
const DAY = 24 * 60 * 60 * 1000;
const MIN_EF = 1.3;

// q: 2 = Chưa nhớ, 3 = Khó, 4 = Tốt, 5 = Dễ
function review(state, q, now = Date.now()) {
  let { ef = 2.5, reps = 0, interval = 0, lapses = 0 } = state || {};

  if (q < 3) {                              // quên → học lại
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    if (reps === 0) interval = 1;           // lần đúng đầu tiên  → 1 ngày
    else if (reps === 1) interval = 6;      // lần đúng thứ hai   → 6 ngày
    else interval = Math.round(interval * ef); // sau đó: nhân với ef
    reps += 1;
  }

  // cập nhật ease factor theo SM-2 GỐC: cố ý áp dụng cho MỌI q (kể cả q < 3,
  // tức quên cũng làm ef giảm). Đây là chủ ý — đừng "tối ưu" bỏ nhánh quên.
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < MIN_EF) ef = MIN_EF;

  // Trả về OBJECT MỚI — không mutate `state` đầu vào (nhờ destructuring ở trên).
  // Giữ tính chất thuần này để preview() gọi được mà không phá state.
  return {
    ef, reps, interval, lapses,
    due: now + interval * DAY,
    lastReviewed: now,
    seen: true,
  };
}
```

> **Lưu ý quan trọng về "Chưa nhớ" (`q < 3`):** hàm này luôn đặt `due = now + 1 ngày`. Đó là lịch **được lưu lại** (persisted) cho ngày mai. Việc "gặp lại thẻ ngay trong phiên hôm nay" là chuyện của **hàng đợi trong-phiên (in-memory)**, KHÔNG dựa vào `due`. Xem §1.4 để tách bạch hai trạng thái này.

**Diễn giải nhanh:**
- Trả lời **đúng** (`q ≥ 3`): khoảng cách tăng dần `1 → 6 → ×ef → ×ef…`, nên thẻ nhớ tốt rất lâu mới hiện lại.
- Trả lời **sai** (`q < 3`): reset, ôn lại sau 1 ngày, `lapses + 1`, và `ef` giảm (thẻ "khó" hơn).
- `ef` được **nới rộng** khi bạn bấm *Dễ* và **thu hẹp** khi bạn bấm *Khó*.

**Xem trước khoảng cách trên từng nút** (để hiện "Tốt · 6 ngày" giống Anki):
```js
function preview(state, q) {
  return review(state, q).interval; // số ngày, không ghi đè state
}
```

> **Tùy chọn nâng cao** (để 4 nút khác nhau rõ hơn ngay ở lần ôn hiện tại): với `reps ≥ 2`, dùng `interval × 1.2` cho **Khó** và `interval × ef × 1.3` cho **Dễ**, thay vì cùng `interval × ef`. Không bắt buộc.

### 1.4. Logic "đến hạn" và xây hàng đợi phiên học

```js
function isDue(state, now = Date.now()) {
  if (!state || !state.seen) return true;   // thẻ mới luôn sẵn sàng
  return state.due <= now;
}

// newLimit:    số thẻ MỚI tối đa đưa vào 1 phiên (tránh quá tải khi học mới).
// maxReviews:  trần thẻ ĐẾN HẠN mỗi phiên (tránh dồn hàng trăm thẻ khi bỏ ôn vài ngày).
// now được truyền vào (KHÔNG gọi Date.now() bên trong) để test được & nhất quán với isDue.
function buildSession(
  cards, getState,
  { newLimit = 20, maxReviews = 100, scope = "all", now = Date.now() } = {}
) {
  const inScope = scope === "all" ? cards : cards.filter(c => c.c === scope);
  const dueCards = [], freshCards = [];
  for (const c of inScope) {
    const st = getState(c.id);
    if (!st || !st.seen) freshCards.push(c);
    else if (isDue(st, now)) dueCards.push(c);   // dùng chung isDue, không lặp lại điều kiện
  }
  // Ưu tiên thẻ đến hạn trước (ôn nợ), thẻ mới sau; chỉ shuffle TRONG mỗi nhóm
  // để không bị "thẻ mới chen ngang" làm loãng phần ôn lại.
  return [
    ...shuffle(dueCards).slice(0, maxReviews),
    ...shuffle(freshCards).slice(0, newLimit),
  ];
}
```

**Hai trạng thái tách bạch (điểm dễ làm sai nhất):**
1. **State đã lưu (persisted)** — `ef/reps/interval/due…` trong `localStorage`, quyết định thẻ có "đến hạn" ở các **phiên sau** không.
2. **Hàng đợi trong-phiên (in-memory)** — mảng các thẻ còn phải xử lý **trong phiên hiện tại**. Đây là nơi xử lý việc "gặp lại ngay".

**Quy tắc khi đang ôn:**
- Bấm **Chưa nhớ** (`q < 3`) → (a) gọi `review()` rồi `saveProgress` (state lưu lại có `due = +1 ngày`); **và** (b) **đẩy lại thẻ vào cuối hàng đợi in-memory** để gặp lại ngay trong phiên này. Việc gặp lại dựa vào hàng đợi, KHÔNG dựa vào `due`.
- Bấm **Khó / Tốt / Dễ** (`q ≥ 3`) → `review()` + `saveProgress`, **bỏ thẻ khỏi hàng đợi in-memory**.
- Hết hàng đợi → màn hình "Hoàn thành phiên" + số thẻ đã ôn + thời điểm thẻ đến hạn kế tiếp (`min(due)` của các thẻ đã `seen`).

### 1.5. Lưu trữ tiến độ (persistence)

App chạy thật (không phải artifact trên claude.ai) → dùng **`localStorage`** (đơn giản, đủ dùng). Lưu nguyên map state dưới 1 key:

```js
const KEY = "phrasal-srs-v1";
function loadProgress()  { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function saveProgress(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} }
function resetProgress() { localStorage.removeItem(KEY); }
```

- `map` dạng `{ [id]: SRstate }`. Mỗi lần đánh giá → cập nhật `map[id]` rồi gọi `saveProgress(map)`.
- **Versioning:** key có hậu tố `-v1`. Khi đổi schema state ở tương lai → đổi sang `-v2` và viết hàm migrate đọc `-v1` rồi nâng cấp (hoặc, nếu chấp nhận mất tiến độ, chỉ cần dùng key mới — dữ liệu cũ bị bỏ qua an toàn). Không bao giờ đọc đè schema cũ bằng code mới mà không kiểm tra.
- Sau này muốn đồng bộ nhiều thiết bị / bộ thẻ rất lớn → chuyển sang **IndexedDB**. Chưa cần ở bản đầu.

### 1.6. Thống kê (pipeline ở màn hình chính)

| Nhóm | Điều kiện |
|---|---|
| **Thẻ mới** | chưa có state (`!seen`) |
| **Đang học** | `seen` và `interval < 21` ngày |
| **Đã thuộc** | `seen` và `interval ≥ 21` ngày |
| **Đến hạn hôm nay** | `isDue(state) === true` (tức `due <= now`, gồm cả thẻ đã trễ hạn) |

(Ngưỡng `21` ngày để tính "đã thuộc" có thể chỉnh.)

> **Ranh giới "ngày":** `due`/`interval` tính theo timestamp ms tuyệt đối nên không phụ thuộc múi giờ. Nhưng nếu muốn đếm "đến hạn trong hôm nay" theo lịch (mọi thẻ due trước nửa đêm địa phương kế tiếp), hãy so với `endOfToday = new Date(); endOfToday.setHours(23,59,59,999)` thay vì `now`. Chọn một cách và dùng nhất quán cho cả thống kê lẫn `buildSession`.

---

## Phần 2 — Lộ trình triển khai (đưa cho Claude Code)

### Stack đề xuất
- **Vite + React** (giữ giống app `.jsx` cũ). Thêm **TypeScript** nếu muốn an toàn kiểu — không bắt buộc.
- Persistence = `localStorage` (không DB).
- **Phần học từ (M1–M4): thuần client-side, không cần backend.** Có thể dùng độc lập ngay.
- **Phần luyện nói (M5+): cần chạy local 2 tiến trình phụ** — `server/proxy.mjs` (Node, giữ token Claude Max) và `whisper-server` (STT). Xem Phần 3–4.
- Đóng gói **PWA** để cài lên điện thoại; expose tùy chọn qua **Cloudflare Tunnel**.

### Cấu trúc thư mục gợi ý
```
server/
  proxy.mjs            // proxy Claude local: giữ token Max, header OAuth, lớp x-proxy-secret
src/
  data/vocab.js        // bộ từ vựng theo chủ đề ({c,v,m,e,d,col}); id suy ra tự động
  srs/sm2.js           // review(), preview(), isDue(), buildSession() — thuần logic, có test
  srs/storage.js       // loadProgress(), saveProgress(), resetProgress()
  srs/vocabStore.js    // gộp vocab built-in + từ người dùng tự thêm; import/export JSON
  srs/session.js       // hàm thống kê (đếm Mới/Đang học/Đã thuộc/Đến hạn)
  ai/chat.js           // gọi proxy local → trả lời Claude (KHÔNG giữ token ở frontend)
  components/
    Dashboard.jsx      // màn hình chính: số liệu + chọn chủ đề + nút bắt đầu
    StudySession.jsx   // lật thẻ + 4 nút đánh giá
    RatingBar.jsx      // 4 nút kèm khoảng cách xem trước
    Stats.jsx          // pipeline: Mới / Đang học / Đã thuộc
    DataManager.jsx    // thêm/sửa từ, import/export JSON, gộp vào bộ built-in
    VoiceChat.jsx      // luyện nói: mic → Whisper → Claude → đọc to
  App.jsx
```

### Các bước (mỗi bước có tiêu chí "xong")

**Bước 1 — Setup + dữ liệu.** Tạo project Vite + React. Dữ liệu đặt ở `data/vocab.js` (file đã có sẵn) theo schema sau. `id` **không** lưu trong từng phần tử mà được **suy ra tự động** khi export.

| Trường | Tên đầy đủ | Ví dụ |
|---|---|---|
| `c` | category — chủ đề | `"Con người & Tính cách"` |
| `v` | từ vựng | `"reliable"` |
| `m` | nghĩa (kèm loại từ) | `"(adj) đáng tin cậy"` |
| `e` | example — câu ví dụ tiếng Anh | `"She's the most reliable person on the team."` |
| `d` | dịch tiếng Việt của câu ví dụ | `"Cô ấy là người đáng tin cậy nhất nhóm."` |
| `col` | collocations — các cụm hay đi kèm (phân tách bằng ` · `) | `"a reliable source · reliable information"` |

```js
// data/vocab.js — cấu trúc thật (đã có sẵn ~150 từ)
const raw = [
  { c: "Con người & Tính cách", v: "reliable", m: "(adj) đáng tin cậy",
    e: "She's the most reliable person on the team — she never misses a deadline.",
    d: "Cô ấy là người đáng tin cậy nhất nhóm — chưa bao giờ trễ hạn.",
    col: "a reliable source · reliable information · a reliable friend" },
  // … các từ khác
];
export const vocab = raw.map((x) => ({ ...x, id: x.c + "::" + x.v }));
export default vocab;
```
→ *Xong khi:* import được mảng `vocab`, đếm đúng số thẻ, và `id` duy nhất (cảnh báo nếu `c::v` trùng — vì cùng một từ có thể nằm ở 2 chủ đề khác nhau vẫn ổn, nhưng trùng nguyên `c::v` thì hỏng).

**Bước 2 — Engine SM-2 (`srs/sm2.js`).** Viết `review`, `preview`, `isDue`, `buildSession` đúng công thức ở Phần 1.3–1.4. Truyền `now` cố định vào test để kết quả tất định. Unit test tối thiểu:
- (a) thẻ mới + *Tốt* (q=4) → `interval = 1`, `reps = 1`, `ef = 2.5` (q=4 không đổi ef), `due ≈ now + DAY`.
- (b) đúng 3 lần liên tiếp (q=4) → `interval` đi `1 → 6 → 15` (≈ round(6×2.5)) và tăng dần.
- (c) *Chưa nhớ* (q=2) → `reps = 0`, `lapses += 1`, `interval = 1`, và `ef` giảm so với trước.
- (d) `ef` không bao giờ xuống dưới `1.3` dù bấm *Chưa nhớ* nhiều lần.
- (e) `review()` KHÔNG mutate object `state` truyền vào.
- (f) `buildSession`: tôn trọng `newLimit`, `maxReviews`, và lọc đúng `scope`.
→ *Xong khi:* test pass.

**Bước 3 — Persistence (`srs/storage.js`).** load / save map vào `localStorage`; có `resetProgress()`.
→ *Xong khi:* reload trang vẫn giữ nguyên tiến độ.

**Bước 4 — Màn hình ôn (`StudySession` + `RatingBar`).** Mặt trước hiện từ (`v`). Bấm/`Space` lật → mặt sau hiện nghĩa (`m`), ví dụ (`e`), bản dịch (`d`), và collocations (`col`, tách theo ` · ` thành các chip). 4 nút đánh giá, mỗi nút kèm khoảng cách xem trước. Cập nhật state + lưu sau mỗi lần đánh giá.
→ *Xong khi:* ôn hết hàng đợi được; bấm *Chưa nhớ* thì thẻ hiện lại trong phiên; mặt sau hiển thị đủ `m/e/d/col`.

**Bước 5 — Logic phiên (`srs/session.js`).** `buildSession` với `newLimit` (mặc định 20), `maxReviews` (mặc định 100) và lọc theo chủ đề. Quản lý **hàng đợi in-memory** tách khỏi state đã lưu (xem §1.4): bấm *Chưa nhớ* thì đẩy thẻ về cuối hàng đợi, các nút khác thì loại khỏi hàng đợi. Màn hình "hoàn thành" khi hết thẻ.
→ *Xong khi:* số thẻ mỗi phiên đúng `newLimit`/`maxReviews` và đúng phạm vi chủ đề; bấm *Chưa nhớ* thẻ quay lại trong phiên nhưng phiên SAU (reload) thẻ đó đến hạn theo `due = +1 ngày`.

**Bước 6 — Màn hình chính (`Dashboard` + `Stats`).** Hiện 4 số liệu (mới / đang học / đã thuộc / đến hạn), chọn "Tất cả" hoặc 1 chủ đề, nút "Ôn N thẻ". Không có thẻ đến hạn → thông báo + thời điểm đến hạn kế tiếp.
→ *Xong khi:* số liệu khớp với dữ liệu trong `localStorage`.

**Bước 7 — Quản lý dữ liệu trong app (`srs/vocabStore.js` + `DataManager.jsx`).** Cho phép nạp thêm từ vựng mà không phải sửa file:
- `vocabStore` đọc bộ **built-in** (`data/vocab.js`) và bộ **người dùng tự thêm** (lưu `localStorage` key riêng, vd `phrasal-vocab-user-v1`), rồi **gộp** lại; khi trùng `id` thì bản người dùng đè bản built-in.
- `DataManager.jsx`: form thêm/sửa 1 từ (`c,v,m,e,d,col`); **import** bằng cách dán JSON (mảng `{c,v,m,e,d,col}`) hoặc tải file `.json`; **export** toàn bộ từ người dùng ra JSON để sao lưu/chuyển máy. Validate: bỏ qua bản thiếu `c` hoặc `v`; báo số từ thêm/bị trùng/bị lỗi.
- Thêm từ mới KHÔNG xoá tiến độ ôn của các thẻ cũ (state khớp theo `id`).
→ *Xong khi:* dán một mảng JSON vài từ → chúng xuất hiện trong thống kê & phiên ôn ngay, vẫn còn sau khi reload; export rồi import lại cho kết quả y hệt.

**Bước 8 — Hoàn thiện.** Phím tắt (`Space` lật, `1–4` đánh giá), giao diện tối dễ nhìn, responsive trên điện thoại, nút **Đặt lại tiến độ** (kèm xác nhận).
→ *Xong khi:* dùng mượt trên điện thoại lẫn bàn phím.

### Definition of Done (toàn app)
- Mở app → thấy số liệu thật từ `localStorage`.
- Ôn một phiên → khoảng cách thẻ thay đổi đúng SM-2; tiến độ vẫn còn sau khi đóng/mở lại.
- Thẻ trả lời sai quay lại sớm; thẻ *Dễ* giãn ra lâu.
- Lọc theo chủ đề và "Đặt lại tiến độ" hoạt động đúng.
- Thêm/import từ vựng mới trong app hoạt động; từ mới vào phiên ôn được mà không mất tiến độ thẻ cũ.

---

## Phần 3 — Tích hợp Claude API (tính năng luyện nói)

### 3.1. Vai trò của Claude & pipeline

Claude **không** dùng để tính `q`/lịch SM-2 (đó là việc của `srs/sm2.js` thuần + self-rating của người học). Ngoài ranh giới đó, Claude đóng **hai** vai trò: (1) **bộ não hội thoại** trong vòng luyện nói (mục này), và (2) **trợ lý dữ liệu học** — *mining* từ vựng và sinh câu/mini-story (xem **Phần 5**).

> _Ghi chú lịch sử:_ ràng buộc cũ "**C5 — không dùng Claude để sinh data vocab**" đã được **gỡ** (chủ ý của chủ dự án) để bật tính năng *mining* ở §5.3. Phần "không dùng Claude để chấm `q`/lịch SM-2" **vẫn giữ** — đó là invariant đảm bảo SM-2 tất định, test được.

```
🎤 Mic ─▶ Whisper (STT: giọng → chữ) ─▶ Claude (hiểu + trả lời)
                                              │
   🔊 Loa ◀── Web Speech API (TTS: chữ → giọng) ◀──┘
```

- **Whisper** = chuyển giọng người dùng thành văn bản (Speech-to-Text). Chạy **local** bằng `whisper.cpp` (binary native, có `whisper-server`) — KHÔNG phải Claude, KHÔNG ra internet.
- **Claude** = nhận văn bản, hiểu ngữ cảnh hội thoại, trả lời tự nhiên như một người bạn luyện tiếng Anh. **Khâu duy nhất ra internet thật** (gọi `api.anthropic.com`).
- **Web Speech API** (`speechSynthesis`, có sẵn trong trình duyệt/điện thoại) = đọc to câu trả lời của Claude.

> Liên hệ với phần học từ: nên cho Claude **ngữ cảnh các từ người dùng đang ôn** (`dueWords` từ `buildSession`) để nó dẫn dắt hội thoại xoay quanh các từ đó và sửa lỗi nhẹ nhàng.

### 3.2. Xác thực: token Claude Max + proxy local (KHÔNG dùng API key trả-token)

App này dùng **token của tài khoản Claude Max** (lấy bằng `claude setup-token`), không phải API key Console. Hệ quả kiến trúc:

- Token Max là **OAuth** → gửi `Authorization: Bearer <token>` **+** header `anthropic-beta: oauth-2025-04-20` (KHÁC với API key dùng `x-api-key`).
- **Không gọi thẳng từ trình duyệt được** (OAuth + CORS hay bị từ chối) → bắt buộc có **một proxy nhỏ chạy local** giữ token, thêm header, và là nơi browser/điện thoại gọi tới.
- Đây là **vùng xám** (token subscription vốn dành cho Claude Code/Claude.ai) — chấp nhận cho dùng cá nhân; rủi ro: token hết hạn phải lấy lại, có thể bị siết.

```js
// server/proxy.mjs — chạy local: CLAUDE_TOKEN=... PROXY_SECRET=... node proxy.mjs  (localhost:8787)
import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  authToken: process.env.CLAUDE_TOKEN,                 // token từ `claude setup-token`
  defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
});

http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");   // app local; siết lại khi expose
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-proxy-secret");
  if (req.method === "OPTIONS") return res.end();

  // Lớp khóa bắt buộc khi expose ra ngoài (token Max!)
  if (req.headers["x-proxy-secret"] !== process.env.PROXY_SECRET)
    return (res.statusCode = 401), res.end("unauthorized");

  let body = ""; for await (const c of req) body += c;
  const { history, dueWords = [] } = JSON.parse(body || "{}");

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,                                    // trả lời nói ngắn → giảm độ trễ
    system:
      "Bạn là người bạn luyện nói tiếng Anh thân thiện. Trả lời NGẮN (1–3 câu), tự nhiên, " +
      "KHÔNG markdown/emoji (sẽ bị đọc to). Nhẹ nhàng sửa lỗi. Gợi dùng các từ khi hợp ngữ cảnh: " +
      dueWords.join(", ") + ".",
    messages: history,                                  // API stateless → gửi lại toàn bộ mỗi lượt
  });
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ text: msg.content.find((b) => b.type === "text")?.text ?? "" }));
}).listen(8787);
```

Frontend chỉ `fetch` tới proxy, **không đụng token**:

```js
// ai/chat.js
export async function reply(history, dueWords = []) {
  const r = await fetch(import.meta.env.VITE_PROXY_URL, {     // vd http://localhost:8787
    method: "POST",
    headers: { "content-type": "application/json", "x-proxy-secret": import.meta.env.VITE_PROXY_SECRET },
    body: JSON.stringify({ history, dueWords }),
  });
  if (!r.ok) throw new Error("proxy " + r.status);
  return (await r.json()).text;
}
```

**Lưu ý kỹ thuật:**
- Model **`claude-opus-4-8`** (ID đầy đủ, không thêm hậu tố ngày).
- API **stateless** → mỗi lượt gửi lại **toàn bộ** `history`; append cả `user` lẫn `assistant` sau mỗi lượt.
- Muốn giảm độ trễ "time-to-first-audio": đổi proxy sang `client.messages.stream(...)` + SSE, gom theo câu rồi đẩy dần sang `speechSynthesis`. Bản đầu cứ chờ trả lời xong cho đơn giản.
- Token hết hạn → chạy lại `claude setup-token`, cập nhật biến môi trường, khởi động lại proxy.

### 3.3. Bước triển khai (nối tiếp lộ trình)

**Bước 9 — Proxy Claude local (`server/proxy.mjs`).** Giữ token Max, thêm header OAuth, endpoint `POST /` nhận `{history, dueWords}` → trả `{text}`, có lớp `x-proxy-secret`.
→ *Xong khi:* `curl` tới `localhost:8787` với secret đúng nhận được câu trả lời từ Claude.

**Bước 10 — Whisper STT local (`server/whisper` hoặc dùng `whisper.cpp` server).** Cài/khởi `whisper-server` (model `base`/`small`). Frontend ghi âm bằng `MediaRecorder` → gửi audio tới Whisper → nhận transcript.
→ *Xong khi:* nói một câu tiếng Anh, nhận lại đúng văn bản.

**Bước 11 — Màn hình luyện nói (`ai/chat.js` + `components/VoiceChat.jsx`).** Nút **"Bắt đầu nói"** (kích hoạt trong cú chạm — cần cho iOS): ghi âm → Whisper → `reply(history, dueWords)` → `speechSynthesis` đọc to. Transcript hai chiều; lấy `dueWords` từ `buildSession`.
→ *Xong khi:* nói trọn một vòng (nói → Claude trả lời → nghe đọc to), lịch sử giữ đúng qua nhiều lượt.

**Bước 12 — Đóng gói PWA (`vite-plugin-pwa`).** `manifest.json` (tên, icon 192/512, `display: standalone`, theme), service worker. Cài được lên màn hình chính điện thoại như app.
→ *Xong khi:* trên điện thoại "Thêm vào màn hình chính" ra icon, mở standalone toàn màn hình.

### Definition of Done (tính năng luyện nói)
- Bật proxy + Whisper local, mở app → nói một câu → nghe Claude trả lời đọc to.
- Hội thoại nhiều lượt giữ đúng ngữ cảnh; Claude cố dùng/gợi các từ đang ôn.
- Cài lên điện thoại dạng PWA, mở bằng icon, mic + đọc to hoạt động (qua HTTPS).

---

## Phần 4 — Triển khai: chạy local + (tùy chọn) expose + PWA

### 4.1. Chạy local (mặc định)
Ba tiến trình trên máy bạn (máy phải bật khi dùng):
1. `node server/proxy.mjs` — proxy Claude (token Max).
2. `whisper-server` — STT local.
3. `npm run dev` (hoặc `npm run preview` cho bản build) — frontend.

Mọi thứ rất nhẹ (proxy ~30–50MB RAM, frontend tĩnh); phần "nặng" duy nhất là model Whisper khi phiên dịch giọng.

### 4.2. (Tùy chọn) Truy cập qua điện thoại / expose ra domain
- **Cloudflare Tunnel** (`cloudflared`): tạo URL HTTPS công khai trỏ về frontend local, gắn được domain riêng, **không mở cổng router**.
- **HTTPS là bắt buộc**: mic (`getUserMedia`) và cài PWA chỉ chạy ở secure context. Tunnel cho HTTPS sẵn.
- **Khóa lại — bắt buộc vì proxy giữ token Max**: bật lớp `x-proxy-secret` (đã có) và/hoặc **Cloudflare Access** (chỉ mình bạn đăng nhập). Public không khóa = ai có link cũng xài tài khoản Claude của bạn.
- Giữ **riêng tư** (chỉ mình bạn dùng) để giảm rủi ro token Max bị siết.

### 4.3. Lưu ý điện thoại (iOS/Android)
- **iOS cần cú chạm người dùng** mới cho phát `speechSynthesis` và mở mic lần đầu → thiết kế nút "Bắt đầu nói" rõ ràng, không auto-play.
- Mic trên điện thoại: audio gửi **về máy bạn** (Whisper local) qua tunnel để phiên dịch — tốn chút băng thông + độ trễ, chấp nhận được.

---

## Phần 5 — Tầng học hiệu quả (Active Learning Layer)

> **Mục tiêu:** biến app từ "lật thẻ" → "**máy luyện *sản xuất* ngôn ngữ**". Tầng này xây **TRÊN** engine SM-2 (Phần 1) — **KHÔNG đổi công thức SM-2**; chỉ đổi *cách hỏi* và *cách nạp từ*. `q` luôn do người học quyết (có thể *gợi ý* từ kết quả tự chấm rồi người học xác nhận); lịch luôn do `srs/sm2.js` thuần tính. Logic thuần (chọn kiểu thẻ, sinh cloze, so khớp đáp án) tách vào **`srs/cardTypes.js`** (có test), UI tách riêng.
>
> **Nguyên tắc khoa học nền tảng:** (1) *active recall* — SM-2 lo; (2) *generation/production* — tự tạo câu, tự nói (§5.1–5.2); (3) *varied context* — gặp từ nhiều kiểu khác nhau (§5.1); (4) *personal relevance* — học từ trong thứ mình quan tâm (§5.3); (5) *comprehensible input* — nghe/đọc ở mức i+1 (§5.7).

### 5.1. Đa dạng kiểu ôn (Varied Retrieval) — `srs/cardTypes.js`

Mỗi thẻ đến hạn được hỏi bằng **một** trong các kiểu sau (xoay vòng / ngẫu nhiên theo thẻ trong phiên). **Tất cả suy ra từ field sẵn có `{v,m,e,d,col}` — KHÔNG cần Claude:**

| Kiểu | Mặt trước | Người học làm | Cách chấm |
|---|---|---|---|
| `recall` (mặc định) | `v` | nhớ nghĩa trong đầu | thủ công (4 nút) |
| `cloze` | câu `e` khoét chỗ `v` → `____` | điền từ còn thiếu | **auto** (khớp chuỗi) → *gợi ý* `q` |
| `listen` | TTS đọc `v` (hoặc `e`) qua Web Speech | gõ lại từ/câu nghe được | **auto** → *gợi ý* `q` |
| `produce` | `v` + yêu cầu "đặt 1 câu dùng từ này" | gõ/nói một câu | thủ công, đối chiếu `e`/`col` |
| `reverse` | `d` (câu tiếng Việt) | nói/gõ lại câu tiếng Anh | thủ công, đối chiếu `e` |

- **Auto-chấm** (`cloze`/`listen`): so chuỗi *không phân biệt hoa thường + trim*. **Sai → gợi ý `q=2` (Chưa nhớ)** nhưng vẫn cho người học override; **Đúng → hiện thanh 4 nút bình thường**. `q` cuối cùng vẫn đi qua `review()` y như cũ (**KHÔNG vi phạm C1**: SM-2 vẫn nhận `q` rồi tính lịch).
- **Sinh cloze:** thay token `v` trong `e` (case-insensitive, theo ranh giới từ) bằng `____`. Nếu `v` **không** xuất hiện nguyên dạng trong `e` (biến cách, vd `"rely"` ≠ `"reliable"`) → **fallback về `recall`**. Hàm thuần, có test.
- Card-type là chuyện **UI/phiên in-memory**, **KHÔNG** ghi vào SR state đã lưu.

→ **Bước 13 (xong khi):** `srs/cardTypes.js` có test pass cho: chọn kiểu hợp lệ; sinh cloze đúng + fallback khi `v` không có trong `e`; so khớp đáp án bỏ qua hoa thường/khoảng trắng; map sai→gợi ý q=2.

### 5.2. Chế độ "Sản xuất trước khi lật" (Generation Effect)

Toggle **"Chế độ sản xuất"**: khi bật, ưu tiên kiểu `produce`/`reverse` — trước khi lộ mặt sau, người học **phải** tạo câu (gõ hoặc bấm mic nói trong cú chạm người dùng). Submit xong mới hiện `e/d/col` để đối chiếu rồi tự chấm. Đây là đòn bẩy ghi nhớ mạnh nhất; **chỉ phụ thuộc M1–M2**, nên làm sớm.

→ **Bước 14 (xong khi):** trong phiên, chuyển được giữa các kiểu thẻ; bật "Chế độ sản xuất" thì phải nhập câu mới lật được; auto-chấm nối đúng vào thanh đánh giá; tiến độ SM-2 vẫn đúng như §1.

### 5.3. Nạp từ vựng từ văn bản thật (Vocab Mining) — dùng Claude

> Giải **bài toán DATA** (khỏi soạn tay ~850 từ) **và** tăng *personal relevance*: học đúng từ trong báo/lyrics/phụ đề/chat bạn đang đọc.

- Mở rộng `DataManager`: dán đoạn text → gửi proxy endpoint **`POST /mine`** `{text, level}` → Claude trả về **mảng JSON** đúng schema `{c,v,m,e,d,col}` (nghĩa tiếng Việt + ví dụ tự nhiên), ưu tiên từ "đáng học" ở mức người dùng.
- Người học **review + tick** từ muốn giữ → merge vào `phrasal-vocab-user-v1` qua `vocabStore` (trùng `id` thì bản người dùng đè).
- **Validate client:** bỏ bản thiếu `c`/`v`; parse JSON an toàn (Claude có thể trả lẫn văn bản → bóc khối JSON); dedupe theo `id`; báo số **thêm / trùng / lỗi**. Thêm từ **không** xoá tiến độ thẻ cũ (state khớp `id`).

→ **Bước 15 (xong khi):** dán một đoạn tiếng Anh → nhận danh sách từ đúng schema → tick vài từ → chúng vào thống kê & phiên ôn ngay, vẫn còn sau reload. (Cần **M5** — proxy.)

### 5.4. Luyện nói có "nhiệm vụ" (Voice Missions) — nâng cấp `VoiceChat`

- Đưa Claude `dueWords` (5–7 từ) + lệnh hệ thống: **dẫn hội thoại để ép người học dùng** các từ đó; cuối lượt/phiên liệt kê từ đã dùng đúng / chưa dùng.
- Whisper transcript lời người học → client đối chiếu **từ `dueWords` nào thực sự được nói ra** → đánh dấu cờ mềm "spoken" (hiển thị động viên/tiến độ). **KHÔNG** tự sửa `q`/lịch SM-2 từ cờ này.

→ **Bước 16 (xong khi):** nói một phiên, Claude chủ động gợi/ép dùng từ due; app báo đúng từ nào bạn đã nói ra. (Cần **M6**.)

### 5.5. Phản hồi phát âm (Pronunciation) — tận dụng Whisper sẵn có

- So transcript Whisper với câu mục tiêu (`e` hoặc câu vừa luyện) ở **mức từ** → tô từ lệch. Nhẹ nhàng, **không** chấm điểm gắt (Whisper không phải máy chấm phát âm chuẩn — chỉ là tín hiệu tham khảo).

→ **Bước 17 (xong khi):** đọc một câu, app chỉ ra (tương đối) từ nào trật so với mục tiêu.

### 5.6. Sổ lỗi → thẻ (Error Journal)

- Lỗi Claude sửa khi luyện nói → nút **"Lưu thành thẻ"** → tạo thẻ mới (qua `vocabStore`, state khớp `id`, không mất tiến độ cũ). Học từ chính lỗi của mình.

→ **Bước 18 (xong khi):** từ một lượt sửa lỗi, lưu được thành thẻ, thẻ đó vào phiên ôn kế tiếp.

### 5.7. Input dễ hiểu (Comprehensible Input) — Mini-story

- Chế độ "đọc/nghe": Claude sinh **2–3 câu** ở **đúng trình độ** dùng vài từ due → hiển thị + TTS đọc to (nghe + ôn cùng lúc). Không markdown/emoji (sẽ bị đọc to).

→ **Bước 19 (xong khi):** bấm "Mini-story hôm nay" → ra đoạn ngắn dùng từ đang ôn, đọc to được. (Cần **M5**.)

### 5.8. Động lực nhẹ (Gamification tối giản)

- Streak ngày học, mục tiêu số thẻ/ngày, hiển thị `min(due)` kế tiếp. Lưu `localStorage` key `phrasal-stats-v1`. **KHÔNG** badge/coin/màu mè.

→ **Bước 20 (xong khi):** học xong phiên → streak +1 nếu là ngày mới; dashboard hiện tiến độ mục tiêu ngày.

### Definition of Done (Tầng học hiệu quả)
- Một từ được ôn bằng nhiều kiểu khác nhau qua các phiên (recall/cloze/listen/produce/reverse); auto-chấm gợi ý `q` đúng nhưng người học vẫn quyết cuối.
- Dán văn bản → mining ra từ đúng schema → vào deck không mất tiến độ cũ.
- Luyện nói: Claude ép dùng từ due, app báo từ đã nói ra; lưu được lỗi thành thẻ.
- Mini-story đọc to được; streak/mục tiêu ngày chạy.
- **Mọi thứ trên KHÔNG đổi công thức SM-2; `q`/lịch vẫn tất định và test được.**

---

## Kế hoạch thực hiện (milestones)

| Mốc | Bước | Mục tiêu kiểm chứng |
|---|---|---|
| **M1 — Engine** | 1–3 | SM-2 + persistence: test pass, reload giữ tiến độ |
| **M2 — Học cơ bản** | 4–6 | Ôn trọn phiên, dashboard số liệu khớp, lọc chủ đề |
| **M3 — Quản lý data** | 7 | Import/export JSON, thêm từ không mất tiến độ cũ |
| **M4 — Hoàn thiện UI** | 8 | Phím tắt, giao diện tối, responsive, đặt lại tiến độ |
| **M5 — Não hội thoại** | 9 | Proxy + token Max: `curl` nhận trả lời Claude |
| **M6 — Nghe & nói** | 10–11 | Vòng nói→Claude→đọc to chạy trọn, đa lượt |
| **M7 — App điện thoại** | 12 | PWA cài được, mic + TTS chạy qua HTTPS |
| **M8 — Expose (tùy chọn)** | §4.2 | Cloudflare Tunnel + khóa, vào được từ điện thoại |
| **M9 — Ôn đa dạng** ⭐ | 13–14 | Cloze/listen/produce/reverse chạy; auto-chấm gợi ý `q`; test `cardTypes` pass. **Chỉ cần M1–M2.** |
| **M10 — Mining** ⭐ | 15 | Dán text → Claude trả JSON đúng schema → merge vào deck không mất tiến độ. **Cần M5 (proxy).** |
| **M11 — Voice nâng cao** | 16–18 | Nhiệm vụ dùng từ due + đối chiếu "spoken"; phản hồi phát âm; sổ lỗi → thẻ. **Cần M6.** |
| **M12 — Input & động lực** | 19–20 | Mini-story + TTS (cần M5); streak/mục tiêu ngày (client-side). |

**Thứ tự khuyến nghị (đã cập nhật theo ưu tiên "học hiệu quả"):**
1. **M1–M4** — app học từ chạy độc lập.
2. **M9** ⭐ — *ôn đa dạng + chế độ sản xuất*. Thuần client (chỉ cần M1–M2), giá trị học **cao nhất**, làm **ngay sau M4** trước cả tính năng nói.
3. **M5–M6** — nền tảng nói (proxy + Whisper + vòng nói cơ bản).
4. **M10** ⭐ — *mining* (cần proxy ở M5): xoá bottleneck dữ liệu.
5. **M11–M12** — voice nâng cao + mini-story + động lực.
6. **M7–M8** — PWA + expose (bất cứ lúc nào sau M6).

⭐ = tính năng tạo khác biệt lớn nhất so với flashcard thường. Mỗi mốc chạy/kiểm tra trước khi sang mốc sau.

---

## Cần đưa cho Claude Code
1. **Tài liệu này** (thuật toán + lộ trình).
2. **File dữ liệu `vocab.js`** (đã có, ~150 từ / 10 chủ đề, mục tiêu ~1000) — Claude Code dùng trực tiếp làm bộ built-in. Bổ sung từ sau này có thể (a) thêm thẳng vào `vocab.js`, hoặc (b) dùng tính năng import trong app (Bước 7).
3. *(Cho M5+)* **token Claude Max** lấy bằng `claude setup-token` (đặt vào biến môi trường `CLAUDE_TOKEN` của proxy, KHÔNG commit vào code) và cài sẵn **`whisper.cpp`** + model (`base`/`small`).
4. *(Tùy chọn)* app `.jsx` cũ, để Claude Code giữ lại phần giao diện / hiệu ứng lật thẻ bạn đã thích.

## Prompt mẫu để bắt đầu với Claude Code
> "Đây là đặc tả thuật toán spaced repetition (SM-2) và lộ trình kèm theo. Hãy dựng app **React (Vite)** đúng theo cấu trúc thư mục, làm **tuần tự theo các mốc M1→M8 (Bước 1→12)**, mỗi mốc chạy test/kiểm tra trước khi sang mốc sau. Ưu tiên hoàn thành **M1–M4** (app học từ chạy được) rồi mới làm tính năng nói.
>
> Dữ liệu từ vựng dùng file `vocab.js` tôi đính kèm (schema `{c,v,m,e,d,col}`, `id` suy ra tự động). Persistence dùng `localStorage`. Có màn hình quản lý/import từ vựng (Bước 7).
>
> Tính năng **luyện nói**: vòng **Whisper (STT local, whisper.cpp) → Claude → Web Speech (TTS)**. Claude gọi qua **proxy Node local** (`server/proxy.mjs`) giữ **token Claude Max** (lấy bằng `claude setup-token`), xác thực `Authorization: Bearer` + header `anthropic-beta: oauth-2025-04-20`, model `claude-opus-4-8`; frontend KHÔNG giữ token, chỉ `fetch` tới proxy kèm `x-proxy-secret`. Đóng gói **PWA** (`vite-plugin-pwa`) để cài lên điện thoại. Giao diện tối, phím tắt, responsive."
