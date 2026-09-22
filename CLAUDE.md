# Project: SRF — Chương trình nói tiếng Anh "1% mỗi ngày"

App cá nhân dạy **nói** tiếng Anh theo lộ trình 12 tuần. Mỗi ngày người học nắm **đúng 1 mẫu câu**
(sentence pattern) + tối đa 6 từ ghép vào mẫu đó, luyện bằng **mồm** (Whisper nghe, Kokoro đọc mẫu),
lịch ôn do **SM-2** tự sắp. Chạy all-local trên cura-dev.

> **Bản viết lại 2026-09-22.** Bản cũ là "hộp đồ nghề" 9 màn tự chọn → người học phải tự làm thầy →
> rối, không thấy tiến bộ, bỏ sau vài hôm. Bản mới: **app là ông thầy**. Mở ra, bấm một nút, học.

## Nguyên tắc tuyệt đối

- **Spec là source of truth**: `Lo_trinh_Spaced_Repetition_Flashcard.md`. KHÔNG đoán business
  behavior — đọc spec trước.
- Logic thuần (`srs/*.js`) **phải pure và có test pass** trước khi ráp vào UI.
- **KHÔNG để token Claude Max lọt vào frontend / localStorage / commit** — token chỉ sống trong biến
  môi trường của proxy. (Xem §Bảo mật token.)
- Làm **tuần tự theo R1→R17** (spec Phần 8). 1 task ≈ 1 commit, **< 100 LOC**.
- Không tự thêm dependency nặng.
- Prompt mơ hồ → DỪNG, hỏi clarify, KHÔNG tự suy diễn rồi code.

## Think Before Code (BẮT BUỘC trước khi viết dòng code đầu tiên)

> KHÔNG viết code ngay sau khi nhận prompt. Qua đủ 5 bước.

```
BƯỚC 1 — ĐỌC HIỂU: prompt muốn gì? Thuộc task nào (R1–R17)? Known Issues bên dưới?
BƯỚC 2 — KHẢO SÁT: đọc file sẽ sửa, grep pattern đã có, đọc test hiện có.
BƯỚC 3 — PLAN: chia task nhỏ (< 100 LOC/commit), xác định cách kiểm chứng.
BƯỚC 4 — VERIFY: function/hook đã tồn tại chưa? Shape state đúng spec chưa? Pattern khác codebase?
BƯỚC 5 — CODE (chỉ sau khi 1–4 xong).
```

### Rules cứng (vi phạm = revert)

1. KHÔNG tạo function/component/hook mới mà chưa grep codebase.
2. KHÔNG đoán schema bài học / SR state — đọc spec §2.2 và §1.1.
3. KHÔNG viết > 50 LOC mà chưa đọc file đang sửa.
4. KHÔNG nhét token/secret vào code client.
5. KHÔNG sửa file có Known Issue mà chưa đọc mục Known Issues.
6. KHÔNG business logic trong component — tách `srs/` (thuần) và hooks/utils.
7. Prompt mơ hồ → hỏi, KHÔNG tự suy diễn.

## Canonical constraints

> Spec duy nhất: **`Lo_trinh_Spaced_Repetition_Flashcard.md`**. Khi code ↔ spec lệch: **spec =
> canonical**, code phải catch up (KHÔNG sửa spec cho match code, trừ khi user xác nhận).

| # | Constraint (KHÔNG vi phạm) | Spec |
|---|---|---|
| C1 | Công thức SM-2 đúng §1.3: `MIN_EF=1.3`; reps0→interval 1, reps1→6, sau đó `round(interval×ef)`; EF cập nhật cho **mọi** `q`; `review()` trả **object mới, KHÔNG mutate**. | §1.3 |
| **C2′** | Đơn vị nội dung là **bài học** (`{day, pat, ex, drills, words, drills2, scene}`), KHÔNG phải thẻ. Review item **suy ra tự động** từ bài (`pat::<day>`, `word::<day>::<w>`) — KHÔNG soạn tay, KHÔNG lưu trong file nội dung. *(Thay thế C2 cũ `{c,v,m,e,d,col}` — đã bỏ.)* | §2.2–2.3 |
| C3 | Tách bạch **state đã lưu** (localStorage, quyết định "đến hạn" ở phiên SAU) vs **hàng đợi in-session**. "Chưa nhớ" lưu `due=+1 ngày` NHƯNG gặp lại trong phiên dựa vào hàng đợi, KHÔNG dựa `due`. | §1.4 |
| C4 | Persistence = `localStorage`; key có version. Item chưa có state = item mới (`seen=false`). | §1.5, §2.4 |
| C5 | Claude = bộ não hội thoại + trợ lý soạn dữ liệu. NHƯNG **KHÔNG** dùng Claude để tính `q`/lịch SM-2 — `q` luôn từ self-rating người học, lịch luôn do `srs/sm2.js` thuần. | §3.1 |
| C6 | Xác thực = **token Claude Max** qua **proxy local**; `Authorization: Bearer` + header `anthropic-beta: oauth-2025-04-20`; model `claude-opus-4-8`. | §6 |
| C7 | **Token chỉ ở env của proxy.** Frontend KHÔNG giữ token — gọi qua proxy kèm `x-proxy-secret`. | §6 |
| C8 | All-local; Claude API là **chỗ duy nhất ra internet**. Mic (`getUserMedia`) + PWA cần **HTTPS/secure context**. | §6 |
| **C9** | **Ma sát bằng không.** KHÔNG màn nào bắt người học chọn chủ đề / trình độ / chế độ trước khi học. Mọi lựa chọn do chương trình quyết theo ngày. | §0.2.1 |
| **C10** | **Nói bằng mồm là bắt buộc.** Nhịp 4 / 4b KHÔNG có ô gõ chữ. Mic hỏng → báo lỗi + retry, KHÔNG fallback sang gõ. | §0.2.3, §3.1 |
| **C11** | **Không mất bài.** Bài gắn với *tiến độ*, không gắn ngày trên lịch. Nghỉ 5 ngày → quay lại vẫn vào bài kế tiếp. Chỉ **streak** gắn lịch. | §3.3 |
| **C12** | **Streak chỉ đếm phần lõi (15').** Bỏ phần mở rộng: không nhắc, không cảnh báo, không mất streak. Không streak-freeze, không push notification. | §4.2 |

## Product context

- **Đối tượng**: một người duy nhất (chủ dự án) — kỹ sư DevOps người Việt, đọc/viết kỹ thuật ổn, yếu
  **từ vựng và cấu trúc câu khi nói**. Mục tiêu: (a) đời thường & du lịch, (b) phỏng vấn & remote.
- **Ngân sách thời gian**: **15 phút lõi bắt buộc + 10 phút mở rộng tuỳ chọn**.
- **Nội dung**: `src/data/course/` — 12 tuần × 6 ngày = 72 mẫu câu. Tuần 1–2 soạn đầy đủ; tuần 3–12
  mới có khung (spec §5). Soạn tiếp theo đợt, KHÔNG soạn hết một lần.
- **Triển khai**: docker compose trên cura-dev, cổng 8088 (nginx + proxy + whisper GPU + kokoro GPU).

## Bảo mật token (CRITICAL)

> Dùng **token tài khoản Claude Max**. Sai một chỗ là lộ tài khoản.

- Token lấy bằng `claude setup-token`, đặt vào **biến môi trường** của proxy (`CLAUDE_TOKEN`) —
  **KHÔNG hardcode, KHÔNG commit, KHÔNG đưa vào frontend/localStorage**.
- `.env` chứa token phải nằm trong `.gitignore`. Kiểm tra trước mỗi commit.
- Frontend chỉ biết `VITE_PROXY_URL` + `VITE_PROXY_SECRET`. Secret nhúng trong bundle là **lớp khóa
  nhẹ** cho dùng local; khi expose ra internet, khóa thật = **Cloudflare Access**.
- **Token hết hạn (401 từ Anthropic)** → xoay bằng 2 bước:
  1. `claude setup-token` — **tương tác**, mở trình duyệt để đăng nhập + duyệt. Không tự động hoá
     được, không ai chạy thay chủ dự án được.
  2. `bash scripts/set-token.sh` — dán token vào dấu nhắc ẩn; script tự kiểm chứng với Anthropic
     TRƯỚC khi ghi, sao lưu `.env` cũ, rồi **tạo lại** container proxy.
  Token đi thẳng bàn phím → server qua stdin: không vào argv (`ps` thấy được), không vào lịch sử
  shell, không in ra màn hình. KHÔNG "vá tạm" bằng cách nhét token vào client.
- **`docker compose restart proxy` KHÔNG đủ** khi đổi `.env`: `env_file` chỉ được đọc lúc **tạo**
  container, nên restart sẽ chạy lại đúng container cũ với token cũ — tưởng đã xoay mà thực ra chưa.
  Phải `docker compose up -d --force-recreate proxy`.

## Stack & cấu trúc

- **Frontend**: Vite + React (JS). Persistence `localStorage`, không DB.
- **Proxy**: `server/proxy.mjs` (Node thuần).
- **STT**: Whisper large-v3 (GPU, container). **TTS**: Kokoro-82M (GPU, container), fallback Web Speech.
- Lõi thuần tách khỏi UI:
  - `srs/sm2.js` — engine lịch ôn (**không đụng**)
  - `srs/items.js` — bài học → review item
  - `srs/lesson.js` — máy trạng thái nhịp 15'/10'
  - `srs/course.js` — tiến độ khoá, streak, `saidBest`
  - `data/course/` — nội dung 12 tuần

## localStorage keys

| Key | Chủ sở hữu |
|---|---|
| `srf-course-v1` | `srs/course.js` (MỚI) |
| `srf-reset-v1` | cờ dọn dữ liệu cũ, chạy 1 lần |
| `phrasal-srs-v1` | `srs/storage.js` — **giữ nguyên tên key** |
| `phrasal-speaking-v1` · `phrasal-coach-v1` · `phrasal-daily-v1` · `phrasal-warmup-v1` | các module nói, **giữ nguyên** |

**KHÔNG đổi tên key của module cũ** — chúng nằm trong danh sách "giữ nguyên" của spec §7.1, đổi key
là đụng vào file lẽ ra không được đụng. Đổi schema → tăng version + migrate/drop an toàn.

## Test (Regression Guard)

- **SM-2 (`srs/sm2.js`)**: test cũ phải pass **nguyên vẹn** — đây là bằng chứng engine không bị đụng
  trong lần viết lại. Fail = đã phá C1.
- **`items.js` / `lesson.js` / `course.js`**: bắt buộc unit test (Vitest), truyền `now` cố định để
  tất định, không mutate tham số.
- **`data/course/course.test.js`**: ràng buộc nội dung L1–L5 (spec §2.2) trên toàn bộ bài đã soạn.
  Đặc biệt **L2** — `drills` lõi không được chứa từ trong `words` (lõi phải chạy độc lập).
- Sửa file lõi → chạy lại test liên quan **trước khi** commit.
- UI/voice không có unit test → kiểm chứng tay theo "Definition of Done" (spec §9).

## Quy ước code

- **State/logic**: `srs/*` thuần, không phụ thuộc React. KHÔNG nhét business logic vào component.
- **KHÔNG hardcode URL/secret** — dùng `import.meta.env.VITE_*`.
- 3 trạng thái mỗi màn tương tác: loading / error (có retry) / success.
- Component vượt ~300 LOC → tách.
- Voice: nút bắt đầu nói phải kích hoạt trong **cú chạm người dùng** (iOS cần) — KHÔNG auto-play TTS,
  KHÔNG tự mở mic.
- Câu trả lời Claude: system prompt yêu cầu **không markdown/emoji** (sẽ bị đọc to) + ngắn (1–3 câu).
- Ngày: luôn dùng `dayStart()` của `srs/daily.js`, KHÔNG tự viết lại cách tính ranh giới ngày.

## Commit Convention

Tiếng Việt không dấu (theo lịch sử repo). Prefix:

```
feat | fix | refactor | test | style | docs | chore
```

Ví dụ: `feat: srs/lesson.js - may trang thai 15p/10p + test`, `fix: nhip 4 khong fallback go chu (C10)`.

## KHÔNG được làm

- KHÔNG để token/secret trong code, commit, frontend, hay `localStorage`.
- KHÔNG gọi Claude trực tiếp từ browser bằng token Max (OAuth+CORS hỏng) — phải qua proxy.
- KHÔNG dùng Claude để tính `q`/lịch SM-2 (C5).
- KHÔNG mutate `state` trong `review()`; KHÔNG để hàm thuần tự gọi `Date.now()` (nhận `now` qua tham số).
- KHÔNG thêm ô gõ chữ vào nhịp nói (C10).
- KHÔNG thêm màn bắt chọn chủ đề/trình độ trước khi học (C9).
- KHÔNG sửa spec cho match code (ngược lại).
- KHÔNG nhận prompt rồi code 1 lần — chia task < 100 LOC.
- KHÔNG commit khi test fail.

## Known Issues & Fix-on-touch

> Khi task chạm file có known issue → tạo task fix issue đó TRƯỚC task chính.

- **cura-dev không ổn định**: máy host có tiền sử treo RCU / Docker hang tái phát, và container mất
  DNS (đã vá bằng `dns: 8.8.8.8` trong `docker-compose.yml`). App không gọi được Whisper/Kokoro →
  **kiểm tra sức khoẻ host TRƯỚC** khi nghi ngờ code.
- **Proxy chưa verify LIVE với token thật**: `cp .env.example .env`, điền `CLAUDE_TOKEN`
  (`claude setup-token`) + `PROXY_SECRET`, chạy proxy, build/preview lại. Proxy có khối system
  "You are Claude Code…" (bắt buộc với token OAuth subscription) — auth lỗi 401/403 thì kiểm tra đây
  đầu tiên.
- **`MiningPanel` + `ai/mine.js` giữ file nhưng đã gỡ khỏi UI** (spec §7.3): là công cụ soạn nội dung
  cho chủ dự án, không phải màn học. Dùng lại khi soạn tuần 3–12.

## References

| Tài liệu | Khi nào đọc |
|---|---|
| `Lo_trinh_Spaced_Repetition_Flashcard.md` | **Source of truth** — SM-2 (§1), schema bài học (§2), nhịp buổi học (§3), streak (§4), khung 12 tuần (§5), giữ/đập (§7), lộ trình R1–R17 (§8), DoD (§9) |
| `TODO.md` | Index task đang làm |

> Bổ sung chi tiết dev → tạo file riêng và link ở đây; KHÔNG nhồi hết vào CLAUDE.md.
