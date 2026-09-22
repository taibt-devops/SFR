# SRF — Chương trình nói tiếng Anh "1% mỗi ngày"

> **Source of truth.** Code lệch spec → spec đúng, code phải catch up. Đổi spec phải có xác nhận
> của chủ dự án. Spec này **thay thế toàn bộ** bản "Spaced Repetition Flashcard" cũ (2026-06-30),
> trừ Phần 1 (SM-2) được giữ nguyên vì engine không đổi.
>
> Ngày viết lại: 2026-09-22 · Quyết định bởi chủ dự án sau khi audit bản cũ.

---

## Phần 0 — Sản phẩm

### 0.1. Vì sao viết lại

Bản cũ là một **hộp đồ nghề**: 9 màn hình, mở app ra phải tự chọn chủ đề → trình độ → chế độ rồi mới
học được. Người dùng phải tự làm thầy cho chính mình. Hệ quả (chủ dự án tự đánh giá, 2026-09-22):

| Triệu chứng | Nguyên nhân gốc |
|---|---|
| "Luồng học rối, không biết bắt đầu từ đâu" | Mỗi buổi học bắt đầu bằng 3 quyết định |
| "Học mãi không thấy tiến bộ" | Đơn vị đo là "đã ôn N thẻ" — hôm nay giống hệt hôm qua, không kể lại được |
| "Dùng vài hôm rồi bỏ" | Không có bản rút gọn cho ngày bận → ngày bận đầu tiên = ngày bỏ |
| "Giao diện nhìn cũ/xấu" | Hệ quả của việc nhồi 8 lựa chọn lên một màn |

Cả bốn cùng một gốc. Bản mới đổi bản chất sản phẩm: **app là ông thầy, không phải cái hộp.**
Mở ra → nó bảo hôm nay học gì → làm theo → xong.

### 0.2. Nguyên tắc (thứ tự ưu tiên khi có xung đột)

1. **Ma sát bằng không.** Mở app là học được ngay. Không dropdown, không toggle, không chọn chủ đề
   trước khi bắt đầu. Mọi lựa chọn đều do chương trình quyết sẵn theo ngày.
2. **Ngày tệ nhất vẫn tiến được.** Luôn tồn tại một phiên bản 15 phút hoàn thành được lúc mệt nhất.
3. **Nói bằng mồm là bắt buộc.** Không có ô gõ chữ thay cho nói. Gõ chữ là chỗ người học trốn.
4. **Tiến bộ phải kể lại được.** Cuối ngày người học nói được "hôm nay tôi học `I'd rather ... than ...`",
   không phải "tôi ôn 20 thẻ".
5. **Không tạo áp lực.** Phần mở rộng là phần thưởng cho ngày khoẻ, không phải món nợ cho ngày mệt.
   Bỏ phần mở rộng: không nhắc, không cảnh báo, không mất streak.

### 0.3. Đơn vị của "1%" = 1 mẫu câu / ngày

Mỗi ngày người học nắm **đúng 1 mẫu câu** (sentence pattern) và tối đa 6 từ ghép vừa vào mẫu đó.

Chọn mẫu câu làm đơn vị, không chọn từ vựng, vì ba lý do:

- **Kể lại được.** "Hôm nay tôi học `I'd rather X than Y`" là một mốc cụ thể, nhớ được. "Hôm nay tôi
  ôn 20 thẻ" thì mọi ngày như nhau — não không ghi nhận đó là tiến bộ.
- **Sinh ra câu, không sinh ra nghĩa.** Chủ dự án tự đánh giá yếu nhất ở *cấu trúc câu*. Thuộc 50 từ
  rời vẫn không ghép nổi một câu; thuộc 1 mẫu thì mở khoá được hàng chục câu.
- **Từ vựng có chỗ bám.** 6 từ mỗi ngày không học rời mà nhét thẳng vào mẫu hôm đó. Học `craving`
  không phải để thuộc nghĩa "sự thèm", mà để bật ra `I've got a craving for something sweet.`

**Hệ quả bắt buộc:** đơn vị nội dung của app là **bài học (lesson)**, không phải **thẻ (card)**.
Đây là chỗ phá vỡ constraint C2 của CLAUDE.md cũ — xem Phần 2.

### 0.4. Đối tượng & mục tiêu

- Một người dùng duy nhất (chủ dự án): kỹ sư DevOps người Việt, đọc/viết kỹ thuật ổn, **yếu từ vựng
  và cấu trúc câu khi nói**.
- Quỹ thời gian thật: 20–30 phút/ngày → chia **15 phút bắt buộc + 10 phút tuỳ chọn**.
- Hai mục tiêu 3–6 tháng: (a) giao tiếp đời thường & du lịch, (b) phỏng vấn & làm remote nước ngoài.
- App cá nhân, chạy all-local trên cura-dev. Không đa người dùng, không đăng ký, không đồng bộ đám mây.

---

> **Phần 1 giữ nguyên từ bản cũ** — engine SM-2 không đổi một dòng trong lần viết lại này.

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

## Phần 2 — Mô hình dữ liệu khoá học

### 2.1. Thay đổi so với bản cũ (phá constraint C2)

Bản cũ khoá cứng schema thẻ `{ c, v, m, e, d, col }` và `id = c + "::" + v` (constraint **C2**).
Bản mới **bỏ C2**, thay bằng **C2′** dưới đây. Lý do: đơn vị học là bài, không phải thẻ; thẻ trở
thành thứ *suy ra từ bài* để nạp vào SM-2.

> **C2′** — Nguồn nội dung là mảng `lessons` trong `src/data/course/`. Thẻ ôn (review item) **suy ra
> tự động** từ bài, KHÔNG soạn tay và KHÔNG lưu trong file nội dung.

### 2.2. Schema bài học

```js
// src/data/course/week01.js
{
  day: 1,                      // 1..72, khoá duy nhất & thứ tự học
  week: 1,                     // 1..12
  track: "daily",              // "daily" (tuần 1-6) | "work" (tuần 7-12)
  title: "Nói điều mình muốn", // tiêu đề ngắn hiện trên màn đóng ngày

  // -- 1% của ngày --
  pat: "I'd like + N / to V",          // mẫu câu (chuỗi hiển thị)
  patKey: "I'd like",                  // mảnh chữ BẮT BUỘC có trong mọi câu của bài (xem L4)
  patVi: "Tôi muốn... (lịch sự)",      // nghĩa tiếng Việt
  note: "Lich su hon 'I want'. Dung khi goi mon, mua do, nho va.", // 1-2 câu, KHÔNG thuật ngữ ngữ pháp

  // -- Nhịp 1 (nghe trước) + nhịp 2 (lộ mẫu): 3 ví dụ, 2 câu đầu dùng cho nhịp 1 --
  ex: [
    { en: "I'd like a coffee, please.",      vi: "Cho tôi một cà phê." },
    { en: "I'd like to check in, please.",   vi: "Tôi muốn làm thủ tục nhận phòng." },
    { en: "I'd like the one by the window.", vi: "Tôi muốn cái cạnh cửa sổ." }
  ],

  // -- Nhịp 4 (LÕI): 3 câu drill, CHỈ dùng từ dễ - không phụ thuộc `words` --
  drills: [
    { vi: "Cho tôi một ly trà.",    en: "I'd like a tea." },
    { vi: "Tôi muốn đặt bàn.",      en: "I'd like to book a table." },
    { vi: "Tôi muốn xem thực đơn.", en: "I'd like to see the menu." }
  ],

  // -- Nhịp 3 (MỞ RỘNG): 6 từ, mỗi từ có câu dùng CHÍNH mẫu câu hôm nay --
  words: [
    { w: "refill", ipa: "/'ri:fil/", m: "(n) lần rót thêm",
      en: "I'd like a refill, please.", vi: "Cho tôi rót thêm với." }
    // ... đủ 6 từ
  ],

  // -- Nhịp 4b (MỞ RỘNG): 2 câu khó hơn, ĐƯỢC dùng từ trong `words` --
  drills2: [
    { vi: "Tôi muốn rót thêm và tính tiền luôn.", en: "I'd like a refill and the bill, please." }
  ],

  // -- Nhịp 5 (MỞ RỘNG): tình huống đóng vai, nạp cho VoiceChat roleplay --
  scene: "Goi mon o quan ca phe - ban la khach, gia su la nhan vien."
}
```

**Ràng buộc nội dung (kiểm bằng test, xem Phần 9):**

| # | Ràng buộc | Vì sao |
|---|---|---|
| L1 | `day` duy nhất, liên tục 1..72; `week = ceil(day / 6)` | Lộ trình tuyến tính, không lỗ hổng |
| L2 | `drills` (lõi) **không được** chứa từ nào trong `words` của chính bài đó | Lõi phải chạy độc lập với phần mở rộng (nguyên tắc 0.2.2) |
| L3 | `ex.length >= 3`, `drills.length === 3`, `words.length <= 6`, `drills2.length <= 2` | Giữ đúng ngân sách 15'/10' |
| L4 | Mọi câu (`ex`, `drills`, `words[].en`, `drills2`) phải chứa nguyên văn `patKey` | Từ vựng luôn có chỗ bám (0.3) |
| L5 | Ngày `day % 6 === 0` có hình dạng rút gọn `{ day, week, track, title, review: true }` — KHÔNG có `pat`. Mọi ngày khác bắt buộc có `pat`. | Nhịp tuần (3.4) |

> **Vì sao có `patKey`:** L4 nói "từ vựng phải bám mẫu câu", nhưng `pat` là chuỗi hiển thị cho người
> đọc (`I'd like + N / to V`) nên không so khớp máy được. `patKey` là mảnh chữ nguyên văn (`I'd like`)
> để test kiểm được thật, thay vì L4 chỉ là lời khuyên suông.

### 2.3. Review item — cầu nối sang SM-2

SM-2 (Phần 1) **không đổi một dòng**. Nó chỉ cần `{ id }` và `getState(id)`. Bài học sinh ra item:

```js
// src/srs/items.js - THUẦN, có test
// Mỗi bài sinh: 1 item mẫu câu + n item từ vựng (chỉ khi người học đã làm nhịp 3).
export function itemsOf(lesson) { /* ... */ }

// id có tiền tố phân loại để màn ôn biết hiển thị kiểu nào:
//   "pat::1"          -> item mẫu câu (bài ngày 1)
//   "word::1::refill" -> item từ vựng
```

| Loại item | Sinh khi | Hỏi thế nào ở nhịp 0 (ôn nhanh) |
|---|---|---|
| `pat::<day>` | Hoàn thành **lõi** ngày đó | Hiện câu tiếng Việt → **nói** câu tiếng Anh |
| `word::<day>::<w>` | Hoàn thành **nhịp 3** ngày đó | Hiện từ → **nói** câu chứa từ đó |

> Item từ vựng chỉ ra đời khi người học thực sự làm phần mở rộng. Đây là cơ chế **tự điều tiết nợ ôn
> tập**: ngày bận không nạp từ mới → hôm sau hàng đợi không phình → 4 phút ôn vẫn đủ. Làm ngược lại
> (bắt buộc nạp từ, ôn thì tuỳ chọn) chỉ cần 3 ngày bận là vỡ hàng đợi và người học bỏ app.

### 2.4. Lưu trữ (localStorage, key có version)

**Không đổi tên key nào của module cũ.** Các module ở 7.1 giữ nguyên đúng nghĩa đen — kể cả hằng số
key của chúng. Bản mới chỉ **thêm một** key.

| Key | Nội dung | Thuộc về |
|---|---|---|
| `srf-course-v1` | `{ [day]: { core, ext, doneAt, saidBest } }` | **MỚI** — `srs/course.js`, xem Phần 4 |
| `phrasal-srs-v1` | map `{ [itemId]: SRstate }` | `srs/storage.js` giữ nguyên; chỉ nội dung đổi (id nay là `pat::`/`word::`) |
| `phrasal-speaking-v1` | lịch sử chấm CEFR | `srs/speaking.js` giữ nguyên |
| `phrasal-coach-v1` | ghi chú gia sư buổi trước | `srs/coachMemory.js` giữ nguyên |
| `phrasal-daily-v1` | hoạt động theo ngày (biểu đồ 14 ngày) | `srs/daily.js` giữ nguyên |
| `phrasal-warmup-v1` | lịch sử khởi động nói 1 phút | `srs/warmup.js` giữ nguyên |

**Dọn một lần khi chạy bản mới lần đầu.** Chủ dự án đã chốt xoá sạch tiến độ cũ và soạn nội dung mới,
nên không migrate gì hết. Khi khởi động, nếu chưa có cờ `srf-reset-v1` thì xoá toàn bộ các key trên
(trừ cờ) **cộng thêm** key của những tính năng đã gỡ — `phrasal-vocab-user-v1`, `phrasal-stats-v1`,
`phrasal-patterns-v1`, `phrasal-voicemode-v1` — rồi đặt cờ. Chạy đúng một lần, không lặp lại.

> Vì sao phải xoá `phrasal-srs-v1` chứ không để kệ: id item đổi hoàn toàn từ `"<chủ đề>::<từ>"` sang
> `"pat::<day>"` / `"word::<day>::<w>"`. State cũ không bao giờ khớp id mới — để lại chỉ tốn chỗ và
> gây nhiễu khi debug.

---

## Phần 3 — Buổi học

### 3.1. Lõi — 15 phút, bắt buộc

Chạy một mạch, mỗi nhịp một màn full-screen, trên đầu là thanh 4 chấm tiến trình. Không có menu,
không nút quay lại chọn chủ đề.

> **Về cách đánh số nhịp:** số thứ tự 0-5 là **định danh cố định** của từng loại nhịp, không phải thứ
> tự chạy. Lõi chạy 0 → 1 → 2 → 4 (thiếu 3 là đúng: nhịp 3 nằm ở phần mở rộng). Giữ số cố định để
> `lesson.js`, test và spec luôn gọi cùng một tên cho cùng một nhịp.

| # | Nhịp | Phút | Nội dung | Nguồn dữ liệu |
|---|---|---|---|---|
| 0 | **Ôn nhanh** | 4' | 5-8 item đến hạn. Người học **không thấy chữ "SRS"** — chỉ thấy "ôn nhanh". | `buildSession(items, ..., { maxReviews: 8, newLimit: 0 })` |
| 1 | **Nghe 2 câu** | 1' | Nghe `ex[0]`, `ex[1]` qua Kokoro, chọn nghĩa tiếng Việt. **Chưa lộ mẫu câu.** | `lesson.ex` |
| 2 | **Lộ mẫu** | 3' | Hiện `pat` + `patVi` + `note` + cả 3 `ex`. Nghe lại được từng câu. | `lesson.pat/note/ex` |
| 4 | **Nói 3 câu** | 7' | Hiện `drills[i].vi` → người học **nói** → Whisper → so với `drills[i].en` → Kokoro đọc mẫu. | `lesson.drills` |

**Vì sao nhịp 1 đứng trước nhịp 2:** vào bài bằng tai rồi mới biết luật, không phải học luật rồi mới
nghe. Thứ tự này khiến cấu trúc dính vào phản xạ thay vì nằm trong sổ tay. Nhịp 1 cố ý chỉ 1 phút để
không ăn vào ngân sách của nhịp 4.

**Nhịp 4 — quy tắc chấm (KHÔNG dùng Claude chấm điểm SM-2):**

- Whisper trả transcript → so khớp với `drills[i].en` bằng `utils/voiceMatch.js` (**giữ nguyên module cũ**).
- Khớp >= ngưỡng → dấu ✓, gợi ý `q = 4`. Lệch → hiện từ sai tô đỏ, cho nói lại **tối đa 2 lần**, gợi ý `q = 2`.
- `q` **cuối cùng vẫn do người học tự chấm** (giữ constraint C5 cũ). Máy chỉ gợi ý.
- Không có ô nhập chữ. Mic hỏng → hiện lỗi + nút thử lại, KHÔNG fallback sang gõ (nguyên tắc 0.2.3).

Hết nhịp 4 → **đóng ngày ngay** (4.1). Phần mở rộng hiện ra *sau* màn đóng ngày.

### 3.2. Mở rộng — 10 phút, tuỳ chọn

| # | Nhịp | Phút | Nội dung | Nguồn |
|---|---|---|---|---|
| 3 | **6 từ mới** | 5' | Mỗi từ: nghe `words[i].en` → nghĩa → **nói lại câu đó**. Xong thì item `word::...` vào SM-2. | `lesson.words` |
| 4b | **Nói 2 câu khó** | 3' | Như nhịp 4 nhưng dùng `drills2`, có từ vừa học. | `lesson.drills2` |
| 5 | **Đóng vai** | 2' | Nạp `lesson.scene` vào **VoiceChat roleplay (giữ nguyên)**. | `lesson.scene` |

Bỏ qua phần này: không nhắc, không đếm ngược, không đánh dấu đỏ. Làm xong cả 3 nhịp → ô ngày hôm đó
được thêm dấu sao (xem 4.2).

### 3.3. Máy trạng thái — `src/srs/lesson.js` (THUẦN, có test)

Không phụ thuộc React, không gọi `Date.now()` bên trong (nhận `now` qua tham số) để test tất định.

```js
// Các nhịp theo thứ tự chạy thật:
export const CORE_STEPS = ["review", "listen", "pattern", "speak"];
export const EXT_STEPS  = ["words", "speak2", "roleplay"];

// Bài của hôm nay = bài chưa hoàn thành lõi, có `day` nhỏ nhất.
// KHÔNG gắn bài theo ngày trên lịch: nghỉ 3 ngày thì quay lại vẫn học tiếp bài kế, không "mất bài".
export function todayLesson(lessons, progress) { /* ... */ }

// Bước kế tiếp trong phiên, hoặc null nếu xong lõi.
export function nextStep(day, progress, { ext = false } = {}) { /* ... */ }

// Ghi nhận xong 1 nhịp -> trả progress MỚI (không mutate).
export function completeStep(progress, day, step, now) { /* ... */ }

// Lõi xong chưa / mở rộng xong chưa.
export function isCoreDone(progress, day) { /* ... */ }
export function isExtDone(progress, day) { /* ... */ }
```

**Quy tắc "không mất bài" (quan trọng):** bài học gắn với **tiến độ**, không gắn với ngày trên lịch.
Nghỉ 5 ngày rồi quay lại thì vẫn vào bài kế tiếp chứ không nhảy cóc. Chỉ có **streak** là gắn lịch.
Làm khác đi thì nghỉ một tuần là mất một tuần nội dung — lý do kinh điển khiến người ta không quay lại.

### 3.4. Ngày thứ 6 mỗi tuần — chốt tuần

Bài có `day % 6 === 0` không có mẫu câu mới. Thay vào đó (vẫn 15' lõi):

| Nhịp | Phút | Nội dung |
|---|---|---|
| 0 | 5' | Ôn nhanh, hàng đợi **ưu tiên item của tuần vừa rồi** |
| A | 5' | **Đánh giá CEFR** — `SpeakingAssess` (**giữ nguyên**), chủ đề = track của tuần |
| B | 5' | **Trò chuyện tự do** — `VoiceChat` chế độ chat (**giữ nguyên**), gia sư dùng 5 mẫu câu trong tuần |

Đây là chỗ đặt lại các màn nói cũ: chúng **không bị đập**, chỉ chuyển từ "nằm chờ trong menu" sang
"có lịch cố định". Nhờ vậy giữ được công cụ mà vẫn bỏ được cái bẫy tự chọn (0.2.1). Đồng thời sửa
mâu thuẫn của bản cũ (plan bắt chấm CEFR mỗi ngày trong khi chính app khuyên 2-3 lần/tuần).

---

## Phần 4 — Đóng ngày, streak, bằng chứng tiến bộ

### 4.1. Màn đóng ngày

Hiện ngay sau nhịp 4, **một màn duy nhất, không cuộn**:

```
                    ✓
        1% hôm nay của bạn

        I'd like + N / to V
        Tôi muốn... (lịch sự)

     Bạn vừa nói được:
     "I'd like to book a table."

            12 ngày liên tục

   [ Học thêm 10 phút ]   [ Xong hôm nay ]
```

- **"Bạn vừa nói được"** = transcript Whisper của câu drill người học nói đúng và khớp cao nhất
  (`saidBest`). Đây là bằng chứng tiến bộ do chính giọng người học tạo ra.
- Nút **"Xong hôm nay"** đóng app về màn chờ — app **không mời học thêm**. Kết thúc dứt khoát khiến
  lần sau mở ra nhẹ đầu.

### 4.2. Streak

- Streak **chỉ đếm phần lõi**. Xong 15' = tick, chuỗi +1.
- Xong thêm mở rộng = thêm dấu sao trên ô ngày đó. **Không làm thì không mất gì.**
- Ranh giới ngày = 00:00 giờ địa phương — dùng lại hàm `dayStart()` của `srs/daily.js` (module giữ
  nguyên), KHÔNG tự viết lại cách tính ngày ở chỗ khác.
- Streak thuộc về `srs/course.js` (đếm ngày hoàn thành **lõi**), **không** dùng `srs/stats.js` cũ —
  module đó đếm theo lượt ôn thẻ, là đúng đơn vị của bản cũ nhưng sai đơn vị của bản này (xem 0.3).
- Không có "streak freeze", không thông báo đẩy, không nhắc nhở. Nguyên tắc 0.2.5.

### 4.3. Màn "Tôi nói được gì rồi"

Màn duy nhất ngoài luồng học chính. Danh sách mẫu câu đã nắm, **mới nhất lên đầu**, mỗi dòng gồm:
mẫu câu + nghĩa + **một câu do chính người học nói** (`saidBest`) + ngày.

Đặt tuần 1 cạnh tuần 6 là thấy ngay khác biệt (`I want coffee` → `I'd rather grab something quick
than sit down for a full meal`). Đây là thứ con số "đã ôn 120 thẻ" không bao giờ làm được — và là
câu trả lời trực tiếp cho than phiền "học mãi không thấy tiến bộ".

Phụ ở cuối màn: biểu đồ 14 ngày (**giữ nguyên** `ProgressChart` + `srs/daily.js`) và trình độ CEFR
gần nhất.

---

## Phần 5 — Khung 12 tuần (72 mẫu câu)

Tuần 1-6 track `daily` (đời thường & du lịch) · Tuần 7-12 track `work` (công việc, phỏng vấn, remote).
Ngày 6 mỗi tuần = chốt tuần (3.4), không có mẫu mới.

### Tuần 1 — Nói điều mình muốn
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 1 | `I'd like + N / to V` | Tôi muốn... (lịch sự) |
| 2 | `Could you + V ...?` | Nhờ ai làm gì |
| 3 | `I'm looking for + N` | Tôi đang tìm... |
| 4 | `Do you have + N?` | Có ... không? |
| 5 | `How much is / are ...?` | Bao nhiêu tiền? |
| 6 | — | Chốt tuần |

### Tuần 2 — Nói về bản thân
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 7 | `I work as + N / at + N` | Tôi làm nghề... / ở... |
| 8 | `I've been ...ing for + time` | Tôi làm ... được bao lâu rồi |
| 9 | `I'm into + N / I like ...ing` | Tôi thích... |
| 10 | `I usually + V` | Thói quen |
| 11 | `I'm not really + adj` | Phủ định nhẹ, tránh nói cộc |
| 12 | — | Chốt tuần |

### Tuần 3 — Hỏi đường & đi lại
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 13 | `How do I get to + place?` | Đi tới ... bằng cách nào? |
| 14 | `Where's the nearest + N?` | ... gần nhất ở đâu? |
| 15 | `Is it far from + N?` | Có xa ... không? |
| 16 | `I need to get to ... by + time` | Tôi cần tới ... trước ... |
| 17 | `Could you tell me when to get off?` | Nhờ báo khi nào xuống |
| 18 | — | Chốt tuần |

### Tuần 4 — Ăn uống & nhà hàng
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 19 | `I'll have the + N` | Tôi gọi món... |
| 20 | `Does it come with + N?` | Có kèm ... không? |
| 21 | `I'm allergic to + N` | Tôi dị ứng... |
| 22 | `Could we get the bill, please?` | Cho tính tiền |
| 23 | `It's a bit too + adj` | Hơi quá ... (phàn nàn nhẹ) |
| 24 | — | Chốt tuần |

### Tuần 5 — Kể chuyện đã xảy ra
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 25 | `I went to ... last + time` | Tôi đã đi ... hôm... |
| 26 | `It was + adj because ...` | Nó ... vì... |
| 27 | `First ..., then ..., after that ...` | Kể theo trình tự |
| 28 | `I've never + p.p.` | Tôi chưa từng... |
| 29 | `It turned out (that) ...` | Hoá ra là... |
| 30 | — | Chốt tuần |

### Tuần 6 — Xử lý trục trặc & lịch sự
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 31 | `Sorry, I didn't catch that.` | Xin lỗi, tôi chưa nghe kịp |
| 32 | `There's a problem with + N` | Có vấn đề với... |
| 33 | `Would it be possible to + V?` | Liệu có thể ... không? |
| 34 | `I'd rather + V than + V` | Tôi thà ... còn hơn... |
| 35 | `Actually, I think ...` | Nói khác ý một cách nhẹ nhàng |
| 36 | — | Chốt tuần + tổng ôn track `daily` |

### Tuần 7 — Giới thiệu bản thân (nghề nghiệp)
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 37 | `I'm a + role, and I mainly + V` | Tôi là ..., chủ yếu làm... |
| 38 | `My day-to-day involves + Ving` | Công việc hằng ngày gồm... |
| 39 | `I'm responsible for + N/Ving` | Tôi phụ trách... |
| 40 | `I've been working with + N for + time` | Tôi dùng ... được ... rồi |
| 41 | `What I enjoy most is + Ving` | Điều tôi thích nhất là... |
| 42 | — | Chốt tuần |

### Tuần 8 — Kể dự án đã làm (khung STAR)
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 43 | `We were facing + N` | Bối cảnh: chúng tôi gặp... |
| 44 | `My task was to + V` | Nhiệm vụ của tôi là... |
| 45 | `What I did was + V` | Việc tôi đã làm là... |
| 46 | `As a result, we + V-ed` | Kết quả là... |
| 47 | `The tricky part was + Ving` | Chỗ khó là... |
| 48 | — | Chốt tuần |

### Tuần 9 — Họp & bất đồng
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 49 | `Just to make sure I understand, ...` | Xác nhận lại cho chắc |
| 50 | `I see your point, but ...` | Hiểu ý bạn, nhưng... |
| 51 | `Let me walk you through + N` | Để tôi đi qua từng bước... |
| 52 | `I'd suggest we + V` | Tôi đề xuất mình... |
| 53 | `Can we circle back to + N?` | Quay lại ... sau được không? |
| 54 | — | Chốt tuần |

### Tuần 10 — Giải thích sự cố (sát việc DevOps)
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 55 | `We're seeing + N` | Chúng tôi đang thấy (triệu chứng)... |
| 56 | `It started happening after ...` | Bắt đầu xảy ra sau khi... |
| 57 | `The root cause turned out to be ...` | Nguyên nhân gốc hoá ra là... |
| 58 | `To fix it, we + V-ed` | Để sửa, chúng tôi đã... |
| 59 | `To prevent this, we're going to + V` | Để ngăn tái diễn, chúng tôi sẽ... |
| 60 | — | Chốt tuần |

### Tuần 11 — Phỏng vấn
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 61 | `In my previous role, I + V-ed` | Ở công ty trước, tôi đã... |
| 62 | `I tend to + V` | Tôi thường có xu hướng... (nói điểm mạnh/yếu) |
| 63 | `I'm looking for a role where ...` | Tôi tìm vị trí mà... |
| 64 | `Could you tell me more about + N?` | Hỏi ngược nhà tuyển dụng |
| 65 | `What does success look like in this role?` | Câu hỏi ghi điểm cuối buổi |
| 66 | — | Chốt tuần |

### Tuần 12 — Remote & thương lượng
| Ngày | Mẫu câu | Nghĩa |
|---|---|---|
| 67 | `I'm based in ..., which is + N hours ahead of ...` | Múi giờ |
| 68 | `I'm flexible on ..., but I'd need ...` | Linh hoạt nhưng cần... |
| 69 | `My expectation is around + N` | Mức mong đợi khoảng... |
| 70 | `I'll follow up with + N by + time` | Tôi sẽ gửi ... trước... |
| 71 | `Just to confirm, we agreed on ...` | Chốt lại thoả thuận |
| 72 | — | Chốt khoá + đánh giá CEFR cuối |

> **Soạn nội dung theo đợt.** Chỉ **tuần 1-2 (12 bài)** được soạn đầy đủ trong lần viết lại này. Các
> tuần còn lại chỉ có khung (bảng trên). Lý do: sau 2 tuần dùng thật mới biết bài đang quá dễ hay quá
> khó — soạn hết 72 bài ngay gần như chắc chắn phải soạn lại. Soạn tiếp khi người học tới tuần 2.

---

## Phần 6 — Hạ tầng (GIỮ NGUYÊN, không đụng)

Toàn bộ phần này đang chạy trên **cura-dev** và không nằm trong phạm vi viết lại:

| Thành phần | File | Ghi chú |
|---|---|---|
| Engine SM-2 | `src/srs/sm2.js` + test | Phần 1 spec này, không đổi một dòng |
| Proxy Claude | `server/proxy.mjs` | Token chỉ ở env proxy (C6, C7 giữ nguyên) |
| STT | service `whisper` (large-v3, GPU) | `docker-compose.yml` |
| TTS | service `kokoro` (Kokoro-82M, GPU) | fallback Web Speech khi 503 |
| Web + reverse proxy | `Dockerfile`, `deploy/nginx.conf` | cổng 8088 |

**Lưu ý vận hành cura-dev:** máy này có tiền sử treo RCU / Docker hang tái phát và container mất DNS
(đã vá bằng `dns: 8.8.8.8` trong compose). Khi app không gọi được Whisper/Kokoro, kiểm tra sức khoẻ
host **trước** khi nghi ngờ code.

---

## Phần 7 — Giữ / đập / viết mới

### 7.1. Giữ nguyên, không sửa

> **Một ngoại lệ đã dùng:** `srs/daily.js` được thêm từ khoá `export` cho hàm `dayStart()` (R5).
> Không đổi hành vi, test cũ vẫn pass. Cần thiết vì CLAUDE.md cấm viết lại cách tính ranh giới ngày ở
> chỗ khác, mà `course.js` phải tính streak theo ngày. Ngoài `export` này, không đụng gì thêm.
```
src/srs/sm2.js (+test)        src/srs/storage.js (+test)     src/srs/daily.js (+test)
src/srs/speaking.js (+test)   src/srs/coachMemory.js (+test)
src/srs/warmup.js (+test)     src/utils/voiceMatch.js (+test) src/utils/fluency.js (+test)
src/utils/tts.js              src/ai/*.js (whisper, chat, assess, coach, scenario, ipa, tts...)
server/*                      deploy/*                        Dockerfile  docker-compose.yml
```

### 7.2. Giữ NHƯNG thay vỏ giao diện + cách vào màn
| Component | Vị trí mới |
|---|---|
| `VoiceChat.jsx` (roleplay) | Nhịp 5 phần mở rộng, nạp `lesson.scene` |
| `VoiceChat.jsx` (chat) | Ngày chốt tuần, nhịp B |
| `SpeakingAssess.jsx` | Ngày chốt tuần, nhịp A |
| `WarmupTalk.jsx` | Tuỳ chọn, vào từ màn chờ (không nằm trong 15' lõi) |
| `ProgressChart.jsx` | Cuối màn "Tôi nói được gì rồi" |
| `Login.jsx`, `ErrorBoundary.jsx`, `TtsControls.jsx` | Giữ, chỉ đổi CSS |
| `ContextBar.jsx` | **Giữ** — `VoiceChat` và `SpeakingAssess` đang dùng (ban đầu xếp nhầm vào 7.3) |
| `hooks/useShadow.js`, `data/scenarios.js` | Giữ — `VoiceChat` dùng |

> **`legacy.css`:** các màn ở bảng trên vẫn dùng class của giao diện cũ, nên `styles.css` cũ được giữ
> lại thành `src/legacy.css` và nạp **trước** `styles.css`. Bảng màu mới ở `:root` đè lên nên chúng
> ăn theo tông mới mà không phải viết lại từng màn. Nợ kỹ thuật có chủ ý: khi nào retheme xong từng
> màn nói thì xoá `legacy.css`.

### 7.3. Đập bỏ
```
src/components/Dashboard.jsx        src/components/StudySession.jsx
src/components/RatingBar.jsx        src/components/ProgressTopics.jsx
src/components/TopicDetail.jsx      src/components/DataManager.jsx
src/components/MiniStory.jsx        src/components/SpeakingProfile.jsx
src/hooks/useStudy.js               src/hooks/useVocab.js
src/srs/vocabStore.js (+test)       src/srs/cardTypes.js (+test)
src/srs/session.js (+test)          src/data/vocab.js (+test)
src/srs/stats.js (+test)            (streak chuyển sang srs/course.js — xem 4.2)
src/styles.css
vocab.js  vocab_batch2.js  vocab_batch3.js  vocab_batch4.js  vocab_batch5.js  vocab_batch6.js
Mockup_Flashcard_SRS.html           jfk.wav
```

> **Giữ file nhưng KHÔNG còn màn nào gọi tới** (dead code có chủ ý, đừng tưởng là sót):
> - `MiningPanel.jsx` + `ai/mine.js` — công cụ soạn nội dung cho chủ dự án, dùng lại khi soạn tuần 3-12.
> - `ai/patterns.js` — sinh mẫu câu theo chủ đề qua Claude. Bản mới có `pat` nằm sẵn trong nội dung nên
>   không cần nữa; giữ vì 7.1 đã chốt không đụng `ai/*`.
>
> `src/styles.css` bị thay nội dung chứ không xoá — bản cũ nằm ở `legacy.css` (xem 7.2).

### 7.4. Viết mới
```
src/data/course/index.js         gộp + validate 12 tuần
src/data/course/week01.js        6 bài, soạn đầy đủ
src/data/course/week02.js        6 bài, soạn đầy đủ
src/data/course/outline.js       khung tuần 3-12 (chưa có nội dung)
src/data/course/course.test.js   test ràng buộc L1-L5
src/srs/items.js (+test)         bài -> review item cho SM-2
src/srs/lesson.js (+test)        máy trạng thái 15'/10'
src/srs/course.js (+test)        tiến độ khoá + streak + saidBest
src/hooks/useLesson.js           nối lesson.js vào React
src/components/Today.jsx         màn chờ: 1 nút "Bắt đầu"
src/components/StepReview.jsx    nhịp 0
src/components/StepListen.jsx    nhịp 1
src/components/StepPattern.jsx   nhịp 2
src/components/StepSpeak.jsx     nhịp 4 + 4b (dùng chung)
src/components/StepWords.jsx     nhịp 3
src/components/DayDone.jsx       màn đóng ngày
src/components/Progress.jsx      "Tôi nói được gì rồi"
src/styles.css                   viết lại từ đầu
```

---

## Phần 8 — Lộ trình commit

1 task ~ 1 commit, **< 100 LOC**. Sau mỗi task: chạy test liên quan → kiểm chứng → commit.
Branch: `rewrite-1-percent`.

| # | Task | Xong khi |
|---|---|---|
| R1 | Viết lại spec + CLAUDE.md (C2 -> C2′, bỏ ràng buộc thẻ) | File này + CLAUDE.md khớp nhau |
| R2 | `data/course/week01.js` + `outline.js` + `course.test.js` | Test L1-L5 pass cho tuần 1 |
| R3 | `srs/items.js` + test | Sinh đúng `pat::`/`word::`, không đụng SM-2 |
| R4 | `srs/lesson.js` + test | `todayLesson`/`nextStep`/`completeStep` tất định với `now` cố định |
| R5 | `srs/course.js` + test | streak chỉ đếm lõi; `saidBest` lưu đúng |
| R6 | Gỡ màn cũ khỏi `App.jsx`, dựng khung điều hướng mới | Build sạch, vào được màn chờ |
| R7 | `styles.css` mới + `Today.jsx` | Màn chờ 1 nút, chạy trên điện thoại |
| R8 | `StepListen` + `StepPattern` | Nhịp 1-2 chạy, Kokoro đọc được |
| R9 | `StepSpeak` (nhịp 4) | Nói -> Whisper -> chấm -> Kokoro đọc mẫu, LIVE |
| R10 | `StepReview` (nhịp 0) | Ôn nhanh lấy đúng item đến hạn |
| R11 | `DayDone` + streak | Đóng ngày, streak +1, `saidBest` hiện đúng |
| R12 | `StepWords` + `drills2` + roleplay (mở rộng) | 10' mở rộng chạy trọn |
| R13 | Ngày chốt tuần (CEFR + chat) | `day % 6 === 0` vào đúng 2 màn nói cũ |
| R14 | `Progress.jsx` | Danh sách mẫu câu + câu người học đã nói |
| R15 | Xoá file rác (7.3) + dọn key `phrasal-*` | Build sạch, không import mồ côi |
| R16 | `data/course/week02.js` | Test L1-L5 pass cho tuần 2 |
| R17 | Deploy cura-dev | `docker compose up -d --build`, vào được cổng 8088 |

---

## Phần 9 — Definition of Done

**Tầng thuần (bắt buộc có test, chạy `npm test` xanh trước mỗi commit):**
- `sm2.js` — test cũ vẫn pass nguyên vẹn (bằng chứng engine không bị đụng).
- `items.js`, `lesson.js`, `course.js` — test tất định (truyền `now`), không mutate tham số.
- `course.test.js` — ràng buộc L1-L5 trên toàn bộ nội dung đã soạn.

**Tầng UI (kiểm chứng tay, không unit test):**
- Mở app -> bấm **một** nút -> chạy hết 15' lõi mà **không phải chọn gì**.
- Nhịp 4 nói được thật: mic -> Whisper -> chấm -> Kokoro đọc mẫu.
- Xong lõi -> màn đóng ngày hiện đúng mẫu câu + câu mình vừa nói + streak +1.
- Bỏ qua phần mở rộng: không có nhắc nhở nào, streak vẫn +1.
- Nghỉ 3 ngày rồi mở lại: vào đúng bài kế tiếp (không mất bài), streak về 1.
- Chạy được trên điện thoại qua HTTPS (mic cần secure context).

**Không được vi phạm:**
- Không token/secret lọt vào commit hay frontend.
- Không dùng Claude để tính `q` hoặc lịch SM-2.
- Không có ô gõ chữ thay cho nói ở nhịp 4 / 4b.
- Không có màn nào bắt người học chọn chủ đề trước khi học.
