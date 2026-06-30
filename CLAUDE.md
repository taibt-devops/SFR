# Project: SRF — Spaced Repetition Flashcard (luyện từ vựng + luyện nói)

App học từ vựng tiếng Anh theo chủ đề, tự sắp lịch ôn bằng **SM-2**, lưu tiến độ `localStorage`, và có tính năng **luyện nói** (Whisper → Claude → Web Speech). App **cá nhân, chạy all-local**.

## Nguyên tắc tuyệt đối
- **Spec là source of truth**: `Lo_trinh_Spaced_Repetition_Flashcard.md`. KHÔNG đoán business behavior — đọc spec trước.
- Logic SM-2 (`srs/sm2.js`) **phải thuần (pure) và có test pass** trước khi ráp vào UI.
- **KHÔNG để token Claude Max lọt vào frontend / localStorage / commit** — token chỉ sống trong biến môi trường của proxy. (Xem §Bảo mật token.)
- Làm **tuần tự theo milestone M1→M12**; xong M1–M4 (app học từ chạy độc lập) → **M9** (ôn đa dạng, client-side, ưu tiên cao) → rồi tính năng nói (M5–M6, M10–M12). Xem §"Thứ tự khuyến nghị" trong spec.
- Không tự thêm dependency nặng — ưu tiên built-in (Web Speech API có sẵn, không cần lib TTS).
- Prompt mơ hồ → DỪNG, hỏi clarify, KHÔNG tự suy diễn rồi code.

## Think Before Code (BẮT BUỘC trước khi viết dòng code đầu tiên)

> KHÔNG viết code ngay sau khi nhận prompt. Qua đủ 5 bước.

```
BƯỚC 1 — ĐỌC HIỂU: prompt muốn gì? Thuộc milestone nào (M1–M12)? Known Issues bên dưới?
BƯỚC 2 — KHẢO SÁT: đọc file sẽ sửa, grep pattern đã có, đọc test SM-2 hiện có.
BƯỚC 3 — PLAN: chia task nhỏ (< 100 LOC/commit), xác định cách kiểm chứng.
BƯỚC 4 — VERIFY: function/hook đã tồn tại chưa? Shape state SR đúng spec chưa? Pattern khác codebase?
BƯỚC 5 — CODE (chỉ sau khi 1–4 xong).
```

### Rules cứng (vi phạm = revert)
1. KHÔNG tạo function/component/hook mới mà chưa grep codebase.
2. KHÔNG đoán shape SR state / schema thẻ — đọc spec §1.1 và §Bước 1.
3. KHÔNG viết > 50 LOC mà chưa đọc file đang sửa.
4. KHÔNG nhét token/secret vào code client.
5. KHÔNG sửa file có Known Issue mà chưa đọc mục Known Issues.
6. KHÔNG business logic trong component — tách `srs/` (thuần) và hooks/utils.
7. Prompt mơ hồ → hỏi, KHÔNG tự suy diễn.

## Source of truth & Canonical constraints

> Spec duy nhất: **`Lo_trinh_Spaced_Repetition_Flashcard.md`**. Khi code ↔ spec lệch: **spec = canonical**, code phải catch up (KHÔNG sửa spec cho match code, trừ khi user xác nhận).

| # | Constraint (KHÔNG vi phạm) | Spec |
|---|---|---|
| C1 | Công thức SM-2 đúng §1.3: `MIN_EF=1.3`; reps0→interval 1, reps1→6, sau đó `round(interval×ef)`; EF cập nhật cho **mọi** `q` (kể cả quên); `review()` trả **object mới, KHÔNG mutate** state. | §1.3 |
| C2 | Schema thẻ `{ c, v, m, e, d, col }`; `id = c + "::" + v` **suy ra tự động** (`raw.map(...)`), KHÔNG lưu `id` trong từng phần tử `raw`. | §Bước 1 |
| C3 | Tách bạch **state đã lưu** (localStorage, quyết định "đến hạn" ở phiên SAU) vs **hàng đợi in-session** (gặp lại ngay trong phiên). "Chưa nhớ" lưu `due=+1 ngày` NHƯNG gặp lại trong phiên dựa vào hàng đợi, KHÔNG dựa `due`. | §1.4 |
| C4 | Persistence = `localStorage`; key có version. Thẻ chưa có state = thẻ mới (`seen=false`). | §1.5 |
| C5 | Claude = bộ não hội thoại (Whisper→Claude→TTS) **và** trợ lý dữ liệu học (mining/sinh câu/mini-story — §5.3, §5.7). NHƯNG **KHÔNG** dùng Claude để tính `q`/lịch SM-2 — `q` luôn từ self-rating người học, lịch luôn do `srs/sm2.js` thuần. _(Cấm cũ "không sinh data vocab" đã gỡ theo chủ ý chủ dự án.)_ | §3.1, §5 |
| C6 | Xác thực = **token Claude Max** (`claude setup-token`) qua **proxy local**; `Authorization: Bearer` + header `anthropic-beta: oauth-2025-04-20`; model **`claude-opus-4-8`** (ID đầy đủ, không hậu tố ngày). | §3.2 |
| C7 | **Token chỉ ở env của proxy.** Frontend KHÔNG giữ token — gọi qua proxy kèm `x-proxy-secret`. | §3.2 |
| C8 | All-local; Claude API là **chỗ duy nhất ra internet**. Mic (`getUserMedia`) + cài PWA cần **HTTPS/secure context**. | §3–4 |

## Product context
- **Đối tượng**: cá nhân (chính bạn) luyện từ vựng + luyện nói tiếng Anh.
- **Dữ liệu**: `vocab.js` theo chủ đề (~150 từ hiện có, mục tiêu ~1000). Bổ sung qua (a) sửa `vocab.js`, (b) import JSON trong app (Bước 7), hoặc (c) **mining** từ văn bản thật bằng Claude (Bước 15, §5.3).
- **Triển khai**: chạy local; tùy chọn expose qua **Cloudflare Tunnel** + cài **PWA** lên điện thoại.
- **Whisper**: chạy **local** (`whisper.cpp`/`whisper-server`), không phải Claude.

## Bảo mật token (CRITICAL — riêng app này)

> Dùng **token tài khoản Claude Max** (vùng xám, chấp nhận cho cá nhân). Sai một chỗ là lộ tài khoản.

- Token lấy bằng `claude setup-token`, đặt vào **biến môi trường** của proxy (`CLAUDE_TOKEN`) — **KHÔNG hardcode, KHÔNG commit, KHÔNG đưa vào `vocab.js`/frontend/localStorage**.
- `.env` chứa token phải nằm trong `.gitignore`. Kiểm tra trước mỗi commit.
- Frontend chỉ biết `VITE_PROXY_URL` + `VITE_PROXY_SECRET` (gửi `x-proxy-secret`). Lưu ý: secret nhúng trong bundle là **lớp khóa nhẹ** cho dùng local; khi **expose** ra internet, khóa thật = **Cloudflare Access** (chỉ mình bạn đăng nhập), đừng dựa vào mỗi `x-proxy-secret`.
- Token hết hạn → chạy lại `claude setup-token`, cập nhật env, restart proxy. KHÔNG "vá tạm" bằng cách nhét token vào client.

## Stack & cấu trúc
- **Frontend**: Vite + React (JS; thêm TypeScript là tùy chọn). Persistence `localStorage`, không DB.
- **Proxy**: `server/proxy.mjs` (Node thuần, không framework nặng) — chỉ cho tính năng nói (M5+).
- **STT**: `whisper.cpp` local. **TTS**: Web Speech API (`speechSynthesis`) — built-in, không lib.
- Cấu trúc thư mục: xem §"Cấu trúc thư mục gợi ý" trong spec. Lõi: `srs/` (thuần, có test) tách khỏi `components/`.

## Quy trình task (theo milestone)
- **`TODO.md`** ở root = index các task đang làm (ngắn gọn). Bám theo bảng milestone M1–M12 trong spec.
- 1 task ≈ 1 commit, **< 100 LOC**. KHÔNG nhận prompt rồi code hết 1 lần — chia nhỏ trước.
- Sau mỗi task: kiểm chứng (test/chạy thử) → cập nhật trạng thái → commit → task kế.
- BLOCKED: ghi lý do, chuyển task không phụ thuộc, quay lại sau.

## Test (Regression Guard)
- **SM-2 (`srs/sm2.js`)**: bắt buộc unit test (Vitest) đúng §Bước 2 — gồm: thẻ mới+Tốt→interval 1 & ef=2.5; đúng 3 lần→interval tăng; Chưa nhớ→reps 0/lapses+1; ef không xuống dưới 1.3; `review()` không mutate; `buildSession` tôn trọng `newLimit`/`maxReviews`/`scope`. Truyền `now` cố định để test tất định.
- **cardTypes (`srs/cardTypes.js`, §5.1)**: test sinh cloze (+ fallback `recall` khi `v` không có trong `e`), so khớp đáp án bỏ qua hoa thường/khoảng trắng, map sai→gợi ý `q=2`. Card-type KHÔNG ghi vào SR state đã lưu.
- Sửa file lõi (`srs/sm2.js`, `srs/storage.js`, `srs/vocabStore.js`, `srs/cardTypes.js`, `server/proxy.mjs`) → chạy lại test liên quan trước khi commit.
- Phần UI/voice không có unit test → **kiểm chứng tay** theo "Definition of Done" của từng Bước trong spec.

## Quy ước code
- **State/logic**: `srs/*` thuần, không phụ thuộc React; component chỉ gọi vào. KHÔNG nhét business logic vào component.
- **localStorage keys** (có version): `phrasal-srs-v1` (tiến độ SR), `phrasal-vocab-user-v1` (từ người dùng thêm/mining), `phrasal-stats-v1` (streak/mục tiêu ngày — §5.8). Đổi schema → tăng version + migrate/drop an toàn.
- **KHÔNG hardcode URL/secret** — dùng `import.meta.env.VITE_*`.
- 3 trạng thái mỗi màn hình tương tác: loading / error (có retry) / success.
- Component vượt ~300 LOC → tách. KHÔNG inline style lộn xộn — gom CSS/utility.
- Voice: nút "Bắt đầu nói" phải kích hoạt trong **cú chạm người dùng** (iOS cần) — KHÔNG auto-play `speechSynthesis`/mở mic.
- Câu trả lời Claude: system prompt yêu cầu **không markdown/emoji** (sẽ bị đọc to) + ngắn (1–3 câu).

## Definition of Done
- M1–M4: test SM-2 pass; reload giữ tiến độ; ôn trọn phiên; số liệu dashboard khớp; import/export hoạt động.
- M5–M6: `curl` proxy nhận trả lời Claude; nói trọn một vòng (nói→Claude→đọc to), đa lượt giữ ngữ cảnh.
- M7: PWA cài được lên điện thoại, mic + TTS chạy qua HTTPS.
- Không lỗi build; không token/secret lọt vào commit.

## Commit Convention
```
feat | fix | refactor | test | style | docs | chore
```
Ví dụ: `feat: SM-2 engine + unit tests (M1)`, `fix: in-session queue không dựa due (C3)`, `docs: cập nhật spec luyện nói`.

## KHÔNG được làm
- KHÔNG để token/secret trong code, commit, frontend, hay `localStorage`.
- KHÔNG gọi Claude trực tiếp từ browser bằng token Max (OAuth+CORS hỏng) — phải qua proxy.
- KHÔNG dùng Claude để tính `q`/lịch SM-2 — `q` từ self-rating, lịch do `srs/sm2.js` (C5). _(Dùng Claude để mining/sinh câu/mini-story = ĐƯỢC PHÉP.)_
- KHÔNG mutate `state` trong `review()`; KHÔNG để `buildSession` tự gọi `Date.now()` (nhận `now` qua tham số).
- KHÔNG sửa spec cho match code (ngược lại); KHÔNG đoán schema/SM-2 — đọc spec.
- KHÔNG nhận prompt rồi code 1 lần — chia task < 100 LOC.
- KHÔNG commit khi test SM-2 fail.

## Known Issues & Fix-on-touch
> Khi task chạm file có known issue → tạo task fix issue đó TRƯỚC task chính.

_None hiện tại — dự án mới khởi tạo. Cập nhật khi phát sinh._

## References
| Tài liệu | Khi nào đọc |
|---|---|
| `Lo_trinh_Spaced_Repetition_Flashcard.md` | **Source of truth** — thuật toán SM-2, schema, lộ trình M1–M12, tầng học hiệu quả (§5), kiến trúc voice/proxy/PWA |
| `vocab.js` | Schema dữ liệu thật `{c,v,m,e,d,col}` |

> Khi bổ sung chi tiết dev (setup, test commands...) → tạo file riêng và link ở đây; KHÔNG nhồi hết vào CLAUDE.md. File này chỉ giữ behavioral core.
