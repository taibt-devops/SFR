# TODO — index

> Root chỉ là index. Chi tiết "xong khi" → spec `Lo_trinh_Spaced_Repetition_Flashcard.md`.
> 1 task ≈ 1 commit, **< 100 LOC**. Sau mỗi task: kiểm chứng → cập nhật trạng thái → commit.
> Trạng thái: `[ ]` TODO · `[~]` đang làm · `[x]` DONE · `[!]` BLOCKED.

## Thứ tự khuyến nghị (ưu tiên "học hiệu quả")
`M1→M4` → **`M9`** ⭐ → `M5→M6` → **`M10`** ⭐ → `M11→M12` → `M7→M8`
⭐ = tính năng tạo khác biệt lớn nhất so với flashcard thường.

---

## M1 — Engine (B1–3)  ✅ DONE
- [x] Scaffold Vite + React + Vitest
- [x] `src/srs/sm2.js` (review/preview/isDue/buildSession) + test
- [x] `src/srs/storage.js` (load/save/reset) + test
- [x] `src/data/vocab.js` (nguồn dữ liệu) + test

## M2 — Học cơ bản (B4–6)
- [x] **B5** `srs/session.js`: hàng đợi in-memory (`currentCard`/`answerQueue`/`isSessionDone`) tách state lưu ("Chưa nhớ" đẩy cuối queue, KHÔNG dựa `due`) + thống kê `computeStats`/`nextDueAt`; **9 test pass**. *(C3, §1.6)*
- [x] **B4** `StudySession` + `RatingBar` + hook `useStudy` + `styles.css` (dark/teal theo mockup); lật thẻ (Space/chạm) → `m/e/d/col` chip; 4 nút preview; phím `1–4`; "Chưa nhớ" quay lại trong phiên (C3). **Verify tay qua Playwright OK.**
- [x] **B6** `Dashboard` + `utils/format.js`: 4 số liệu (`computeStats`), chip chọn chủ đề (scope), "Ôn N thẻ" (= `buildSession` tôn trọng newLimit/maxReviews) + "X mới + Y ôn lại", empty-state hiện `min(due)` kế. **Verify tay Playwright OK → M2 xong.**

## M3 — Quản lý data (B7)  ✅ DONE
- [x] **B7** `srs/vocabStore.js` (+9 test) + `hooks/useVocab.js` + `DataManager.jsx`: gộp built-in + `phrasal-vocab-user-v1` (trùng id user đè); thêm/sửa, import (dán JSON/file) báo thêm/trùng/lỗi, export file, xoá. **Verify Playwright OK.**
- [x] **Dọn data**: gộp `vocab.js` + `vocab_batch2..6.js` (900 từ / 60 chủ đề, không trùng id) vào `src/data/vocab.js`.

## M4 — Hoàn thiện UI (B8)  ✅ DONE
- [x] **B8** "Đặt lại tiến độ" (confirm → xoá `phrasal-srs-v1` + reset state ngay); 60 chủ đề → **dropdown** gọn; phím tắt `Space`/`1–4` (đã có B4); dark/responsive. **Verify Playwright OK.**

## M9 — Ôn đa dạng ⭐ (B13–14) — *làm NGAY sau M4; chỉ cần M1–M2*
- [x] **B13** `srs/cardTypes.js` **thuần + 10 test**: `makeCloze` (khoét cụm từ, fallback null khi `v` không có trong `e`); `checkAnswer`/`normalize` (bỏ hoa thường/trim); `suggestedQ` (sai→2); `availableTypes`/`pickType` (tất định theo seed); `isAutoGraded`. *(§5.1, không đổi SM-2)*
- [x] **B14** `StudySession` đa kiểu (`recall/cloze/listen/produce/reverse`, phase prompt→revealed) + toggle "Chế độ sản xuất" (ưu tiên produce/reverse) + `RatingBar` nhận `suggestedQ`; auto-chấm cloze/listen gợi ý `q` (sai→"Chưa nhớ"), `q` vẫn người học chọn; listen dùng `speechSynthesis`. **Verify Playwright OK → M9 xong.** *(§5.1–5.2)*

## M5 — Não hội thoại (B9) — *nền tảng voice + mining*
- [x] **B9** `server/proxy.mjs` (Node thuần, fetch built-in): `CLAUDE_TOKEN`+`PROXY_SECRET` (env), header OAuth Bearer + `anthropic-beta`, model `claude-opus-4-8`, routes `POST /` (chat) + `POST /mine`. `.env.example` thêm; `.gitignore` đã chặn `.env`. **Smoke-test gate/route OK (OPTIONS/401/404/forward). Live cần token thật.** *(C6,C7)*

## M6 — Nghe & nói (B10–11)  — frontend xong, chờ Whisper+token để verify LIVE
- [~] **B10** `ai/whisper.js` (gửi audio → whisper-server `/inference`, `VITE_WHISPER_URL`). **Cần bạn cài `whisper.cpp` server.** Caveat: MediaRecorder xuất webm/opus → whisper cần ffmpeg/convert sang wav 16kHz.
- [x] **B11** `ai/chat.js` (gọi proxy `/`) + `VoiceChat.jsx`: nút "Bắt đầu nói" (mic trong cú chạm), ghi âm→Whisper→`reply(history,dueWords)`→`speechSynthesis`, hội thoại đa lượt (gửi lại history), bong bóng 2 chiều + nút 🔊. **Verify Playwright: render + dueWords + lỗi mic gracefully.** Vòng nói đầy đủ cần mic+Whisper+token. *(C8)*

## M10 — Mining ⭐ (B15) — *cần M5*  ✅ DONE
- [x] **B15** Proxy `/mine` (bóc JSON an toàn) + `ai/mine.js` (client, chỉ `x-proxy-secret`, không token) + `MiningPanel.jsx` (dán text → loading/error-retry/review → tick → `importText` merge). Nối vào `DataManager`. **Verify luồng UI qua proxy giả OK; live cần token.** *(§5.3)*

## M11 — Voice nâng cao (B16–18) — frontend xong, verify ✓-mark/diff cần vòng nói LIVE
- [x] **B16** `utils/voiceMatch.js#matchSpoken` (+test) → đối chiếu transcript với `dueWords` → checklist ✓ (cờ mềm, KHÔNG sửa q/lịch); chips trên VoiceChat. *(§5.4)*
- [x] **B17** `voiceMatch.js#diffWords` (+test) + nút "🎯 Đọc theo" mỗi câu Claude → so phát âm mức từ, tô đỏ từ lệch. *(§5.5)*
- [x] **B18** Nút "＋ Thẻ" mỗi câu Claude → form lưu nhanh (`c="Sổ lỗi (luyện nói)"`, e=câu) qua `addWord`. *(§5.6)*
  - _Verify: pure logic (4 test) + chips render OK. ✓-mark/diff/lưu thật cần mic+Whisper+token._

## M12 — Input & động lực (B19–20)  ✅ DONE
- [x] **B19** Mini-story: proxy `/story` + `ai/story.js` + `MiniStory.jsx` (loading/error-retry/done, TTS "Đọc to", dùng `dueWords`). **Verify qua proxy giả OK; live cần token.** *(§5.7)*
- [x] **B20** `srs/stats.js` (+6 test): `recordReview`/`streakFor`/`todayReviewedFor` (key `phrasal-stats-v1`); nối `useStudy` (ghi mỗi lần đánh giá) + streak-bar trên Dashboard. **Verify Playwright: chuỗi 1 ngày, hôm nay 1/20.** *(§5.8)*

## M7 — App điện thoại (B12)  ✅ DONE
- [x] **B12** PWA: `vite-plugin-pwa` (autoUpdate, workbox precache 11 entries) + manifest (standalone, theme `#0f1115`) + icon 192/512/maskable + apple-touch + favicon. **Verify Playwright: SW đăng ký (scope /), manifest linked, secure context.** _Test cài thật trên điện thoại cần HTTPS (M8)._

## M8 — Expose (tùy chọn, §4.2)
- [ ] Cloudflare Tunnel (HTTPS) + khóa (`x-proxy-secret` và/hoặc Cloudflare Access). Giữ riêng tư.

---

## M13 — Rà soát PHƯƠNG PHÁP HỌC (chưa làm — ĐÁNH GIÁ LẠI trước khi code)

> Nguồn: audit 8 nguyên lý học (SRS · recall · difficulty · production · input/story · chunking · interleaving · self-reference) ngày 2026-07-01. Chấm: ✅ chuẩn · 🟡 một phần · 🔴 cho có. **KHÔNG code cho tới khi chủ dự án duyệt từng mục** (nhiều mục đụng UX/pedagogy, cần quyết định chủ đích — không tự suy diễn theo CLAUDE.md).
>
> **Sợi chỉ đỏ:** kiểu ôn chọn bằng `seed` xoay vòng ([cardTypes.js `pickType`], [StudySession.jsx:47]) — KHÔNG theo độ thành thạo từng thẻ. Sửa đúng chỗ này vá cùng lúc #1+#2+#3.

- [ ] **T1 🔴 Desirable difficulty — `pickType` thích ứng theo `reps/ef`** *(tác động cao nhất)*
  - Hiện: thẻ mới toanh vẫn có thể bị produce/cloze/listen ngay lần đầu → test-before-teach, gây nản.
  - Đề xuất (CẦN DUYỆT bậc thang): lần đầu (`!seen`/`reps=0`)→recall; `reps≥1`→cloze/listen; `reps≥2` & ef ổn→produce/reverse.
  - Thuần trong `srs/cardTypes.js`, thêm test, KHÔNG đụng SM-2. Đọc spec §5.1 trước.
- [ ] **T2 🟡 Active recall — "recall" bớt thụ động**
  - Hiện: recall chỉ lật thẻ + tự chấm (dựa tính trung thực). Cân nhắc: buộc nghĩ-rồi-lật (đếm giờ) HOẶC gõ nghĩa. *(Quyết định UX — hỏi trước.)*
- [ ] **T3 🟡 Production — gate produce sau `reps≥2` + prompt self-reference**
  - Gộp với T1 (thứ tự) + đổi prompt produce → "đặt câu VỀ CHÍNH BẠN" (kích self-reference, xem T8).
- [ ] **T4 🟡 Input/story — đưa câu ngữ cảnh vào đầu thẻ MỚI + lưu/tái dùng story**
  - Hiện MiniStory tách rời, sinh xong không lưu. Cân nhắc: thẻ mới hiện `e` (câu) trước khi lộ nghĩa; lưu story để nghe lại. *(Đụng luồng học chính — cần duyệt.)*
- [ ] **T5 🟡 Chunking — card-type "điền/hỏi collocation" (dùng `col`)**
  - Hiện chỉ cloze khai thác chunk; `col` chỉ hiện thụ động mặt sau. Cân nhắc kiểu ôn hỏi theo cụm.
- [ ] **T6 🟡 Self-reference ở flashcard** — sửa 1 dòng prompt produce (gộp T3).
- [ ] **T7 ✅→tinh chỉnh SRS — xen kẽ new/due trong `buildSession`**
  - Hiện thẻ mới xếp CUỐI hết ([sm2.js:74]). Cân nhắc trộn xen kẽ. Nhỏ, có test. *(SM-2 core — cẩn trọng, giữ C1/C3.)*

> **Đã CHUẨN, không cần đụng:** SRS core (SM-2 đúng §1.3, C1/C3), Interleaving (trộn chủ đề + xoay kiểu).

---

## Archive
- M1 hoàn tất (scaffold + sm2 + storage + vocab, có test).

## Known Issues / BLOCKED
- **Proxy/mining chưa verify LIVE** (cần `CLAUDE_TOKEN` thật). Để chạy thật: `cp .env.example .env`, điền `CLAUDE_TOKEN` (`claude setup-token`) + `PROXY_SECRET` + `VITE_PROXY_*`, chạy `node server/proxy.mjs`, build/preview lại. Proxy đã thêm khối system "You are Claude Code…" (yêu cầu cho token OAuth subscription) — nếu auth lỗi 401/403, đây là chỗ kiểm tra đầu tiên.
- ~~Dashboard 60 chip chủ đề quá dài~~ → đã chuyển dropdown ở B8.
- `vocab_batch2+` có thêm field `pat` (mẫu câu) ngoài schema C2 `{c,v,m,e,d,col}` — vô hại (UI bỏ qua); cân nhắc dùng `pat` để học kèm sau này.
