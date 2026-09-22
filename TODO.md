# TODO — index (viết lại "1% mỗi ngày")

> Root chỉ là index. Chi tiết "xong khi" → spec `Lo_trinh_Spaced_Repetition_Flashcard.md` §8, §9.
> 1 task ≈ 1 commit, **< 100 LOC**. Sau mỗi task: chạy test → kiểm chứng → cập nhật trạng thái → commit.
> Trạng thái: `[ ]` TODO · `[~]` đang làm · `[x]` DONE · `[!]` BLOCKED.
> Branch: `rewrite-1-percent`.

---

## Nền (spec + dữ liệu)

- [x] **R1** Viết lại spec + CLAUDE.md — C2 → C2′, thêm C9–C12 (ma sát 0 · nói bắt buộc · không mất
      bài · streak chỉ đếm lõi). Giữ nguyên Phần 1 (SM-2).
- [ ] **R2** `data/course/week01.js` (6 bài) + `outline.js` (khung tuần 3–12) + `course.test.js`
      (ràng buộc L1–L5).
- [ ] **R16** `data/course/week02.js` (6 bài) — làm sau khi luồng chạy được, trước khi dùng thật.

## Lõi thuần (bắt buộc có test, không phụ thuộc React)

- [ ] **R3** `srs/items.js` — bài → review item `pat::<day>` / `word::<day>::<w>`. KHÔNG đụng SM-2.
- [ ] **R4** `srs/lesson.js` — máy trạng thái `CORE_STEPS`/`EXT_STEPS`, `todayLesson`/`nextStep`/
      `completeStep`. Nhận `now`, không mutate. (C11: bài gắn tiến độ, không gắn lịch.)
- [ ] **R5** `srs/course.js` — tiến độ khoá + streak (chỉ đếm lõi, C12) + `saidBest`.

## Giao diện (viết lại từ đầu)

- [ ] **R6** Gỡ 9 màn cũ khỏi `App.jsx`, dựng khung điều hướng mới. Build sạch.
- [ ] **R7** `styles.css` mới + `Today.jsx` — màn chờ **một nút**, chạy được trên điện thoại. (C9)
- [ ] **R8** `StepListen` (nhịp 1) + `StepPattern` (nhịp 2) — Kokoro đọc được.
- [ ] **R9** `StepSpeak` (nhịp 4) — nói → Whisper → `voiceMatch` chấm → Kokoro đọc mẫu. **Verify LIVE.**
      KHÔNG ô gõ chữ (C10).
- [ ] **R10** `StepReview` (nhịp 0) — ôn nhanh lấy đúng item đến hạn, không lộ chữ "SRS".
- [ ] **R11** `DayDone` — đóng ngày, streak +1, hiện `saidBest`.
- [ ] **R12** Mở rộng 10': `StepWords` (nhịp 3) + `drills2` (4b) + roleplay (nhịp 5).
- [ ] **R13** Ngày chốt tuần (`day % 6 === 0`) → `SpeakingAssess` + `VoiceChat` chat (**màn cũ, giữ nguyên**).
- [ ] **R14** `Progress.jsx` — "Tôi nói được gì rồi": mẫu câu + câu chính mình đã nói.

## Dọn & triển khai

- [ ] **R15** Xoá file ở spec §7.3 + dọn key `phrasal-*` một lần (cờ `srf-reset-v1`). Không import mồ côi.
- [ ] **R17** Deploy cura-dev: `docker compose up -d --build`, vào được cổng 8088.

---

## Giữ nguyên — KHÔNG đụng (spec §7.1)

`srs/sm2.js` · `srs/storage.js` · `srs/daily.js` · `srs/speaking.js` · `srs/coachMemory.js` ·
`srs/warmup.js` · `utils/voiceMatch.js` · `utils/fluency.js` · `utils/tts.js` · `ai/*` ·
`server/*` · `deploy/*` · `Dockerfile` · `docker-compose.yml`

> Test SM-2 cũ phải pass **nguyên vẹn** suốt quá trình viết lại — đó là bằng chứng engine không bị đụng.

## Giữ nhưng thay vỏ (spec §7.2)

`VoiceChat` (roleplay → nhịp 5; chat → ngày chốt tuần) · `SpeakingAssess` (ngày chốt tuần) ·
`WarmupTalk` (tuỳ chọn từ màn chờ) · `ProgressChart` (cuối màn Tiến bộ) · `Login` · `ErrorBoundary` ·
`TtsControls`

## Known Issues / BLOCKED

- **cura-dev không ổn định** — treo RCU / Docker hang tái phát, container từng mất DNS. Whisper/Kokoro
  không gọi được → kiểm tra host TRƯỚC khi nghi ngờ code.
- **Proxy chưa verify LIVE với token thật** — cần `CLAUDE_TOKEN` (`claude setup-token`) trong `.env`.
  Auth 401/403 → kiểm tra khối system "You are Claude Code…" trong `server/proxy.mjs` đầu tiên.
- **Nội dung mới chỉ có tuần 1–2.** Tuần 3–12 mới có khung mẫu câu (spec §5), soạn tiếp theo đợt.

## Archive — bản cũ (2026-06-30 → 2026-07-13)

M1–M12 đã hoàn tất: engine SM-2 + test, flashcard 900 từ/60 chủ đề, ôn đa dạng (cloze/listen/produce),
proxy Claude + mining, voice chat + đóng vai, chấm CEFR, PWA, Kokoro TTS, biểu đồ tiến độ 14 ngày.
Phần **engine + hạ tầng giữ lại**; phần **9 màn UI + dữ liệu từ vựng bị thay** (spec §0.1 giải thích
vì sao). Mục T2–T7 (rà soát phương pháp học) đã được hấp thụ vào thiết kế mới, không theo dõi riêng nữa.
