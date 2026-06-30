# 🧠 SRF — Spaced Repetition Flashcard

> **Học từ vựng tiếng Anh thông minh — và *nói* được nó.**
> Một app cá nhân, chạy all-local: tự sắp lịch ôn bằng **SM-2**, ôn theo **5 kiểu** để nhớ sâu, và **luyện nói** với Claude qua vòng *Whisper → Claude → đọc to*.

<p align="center">
  <em>Dark UI · 900 từ / 60 chủ đề · PWA cài lên điện thoại · 56 unit test xanh</em>
</p>

---

## ✨ Vì sao app này khác Anki/Quizlet?

Flashcard thường chỉ kiểm tra **nhận diện** thụ động. SRF được thiết kế quanh 4 nguyên tắc làm ngôn ngữ *dính*:

| Nguyên tắc | SRF làm gì |
|---|---|
| **Active recall** | Engine **SM-2** thuần, tự sắp lịch ôn (`reps → interval × ease`). |
| **Production** (tự tạo ra ngôn ngữ) | **Chế độ sản xuất**: bắt bạn *đặt câu / nói* trước khi lật thẻ. |
| **Varied context** | Mỗi từ được hỏi bằng **5 kiểu** khác nhau, không lặp một mặt thẻ. |
| **Personal relevance** | **Mining**: dán bài báo/lyrics/phụ đề → Claude trích từ → vào deck. |

Và thứ Anki **không** có: **luyện nói gắn đúng từ bạn đang ôn** — Claude dẫn hội thoại, *ép* bạn dùng các từ đến hạn, rồi đối chiếu xem bạn đã nói ra được những từ nào.

---

## 🎯 Tính năng

**Học từ (chạy 100% offline, không cần token):**
- 🔁 **SM-2** chuẩn: thẻ nhớ tốt giãn ra, thẻ quên quay lại sớm.
- 🃏 **5 kiểu ôn**: `recall` · `cloze` (điền vào câu) · `listen` (nghe → gõ) · `produce` (đặt câu) · `reverse` (dịch Việt→Anh). Cloze/listen **tự chấm** và *gợi ý* mức nhớ — nhưng bạn vẫn là người quyết.
- ✍️ **Chế độ sản xuất** — tạo câu trước khi lật (hiệu ứng *generation* mạnh nhất cho trí nhớ).
- 📊 **Dashboard**: Mới / Đang học / Đã thuộc / Đến hạn; lọc theo chủ đề; "Ôn N thẻ".
- 💾 **Lưu tiến độ** qua `localStorage`; phím tắt `Space` (lật) + `1–4` (đánh giá).
- 🔥 **Streak** ngày + mục tiêu thẻ/ngày.
- 📥 **Quản lý dữ liệu**: thêm/sửa từ, import/export JSON, gộp với 900 từ built-in.

**Cần proxy + token Claude Max:**
- ⛏️ **Mining** — dán văn bản thật → Claude trích từ đáng học → tick → vào deck.
- 📖 **Mini-story** — Claude viết 2–3 câu ở đúng trình độ dùng từ đang ôn, đọc to bằng TTS.
- 🎙️ **Luyện nói** — mic → Whisper (STT local) → Claude → Web Speech (đọc to); hội thoại đa lượt; đối chiếu từ đã nói; **đọc theo** để soi phát âm; **lưu lỗi thành thẻ**.

**Triển khai:**
- 📱 **PWA** — cài lên màn hình chính điện thoại, chạy standalone, offline phần học từ.

---

## 🏗️ Kiến trúc

```
🎤 Mic ─▶ Whisper (STT local) ─▶ Claude (proxy giữ token) ─▶ 🔊 Web Speech (TTS)
   (whisper.cpp)                   server/proxy.mjs              speechSynthesis
```

- **Lõi thuần, có test** (`src/srs/`, `src/utils/`): SM-2, hàng đợi phiên, kiểu thẻ, thống kê, streak — **không phụ thuộc React**, dễ kiểm chứng.
- **UI** (`src/components/`) chỉ gọi vào lõi + hook (`src/hooks/`). Không nhét business logic vào component.
- **Proxy** (`server/proxy.mjs`): Node thuần (`fetch` built-in), giữ token, là **chỗ duy nhất ra internet**.

> 🔐 **Token Claude Max sống DUY NHẤT trong biến môi trường của proxy** — không bao giờ lọt vào frontend, `localStorage`, hay commit. Frontend chỉ gửi `x-proxy-secret`.

---

## 🚀 Bắt đầu nhanh (chỉ phần học từ — không cần token)

```bash
npm install
npm run dev          # mở http://localhost:5173
```

Vậy là đủ để học từ, ôn đa dạng, mining-trừ-Claude, import/export, streak, PWA.

### Bật tính năng Claude (mining / mini-story / luyện nói)

```bash
cp .env.example .env
#  Điền:  CLAUDE_TOKEN=$(claude setup-token)   PROXY_SECRET=<chuỗi-ngẫu-nhiên>
#         VITE_PROXY_URL=http://localhost:8787  VITE_PROXY_SECRET=<khớp PROXY_SECRET>
#         VITE_WHISPER_URL=http://localhost:8080/inference

node server/proxy.mjs                 # proxy Claude @ :8787
# (cho luyện nói) chạy whisper.cpp server, vd:
#   ./whisper-server -m models/ggml-base.en.bin --port 8080

npm run build && npm run preview      # frontend đọc VITE_* lúc build
```

> ⚠️ **Audio format:** trình duyệt ghi `webm/opus`; `whisper.cpp` thường cần `wav 16kHz` → cần ffmpeg/convert ở phía whisper-server. Đây là chỗ dễ vướng nhất khi luyện nói.
>
> ⚠️ **PWA cache:** sau `npm run build`, service worker có thể serve bản cũ — hard-reload (`Ctrl+Shift+R`) hoặc đợi auto-update.

---

## 🧪 Test

```bash
npm test             # 56 unit test (Vitest)
```

Lõi logic đều có test tất định (truyền `now` cố định): SM-2, hàng đợi phiên, kiểu thẻ, vocab store, thống kê streak, so khớp lời nói.

---

## 📁 Cấu trúc

```
server/proxy.mjs        # proxy Claude: token + header OAuth + routes / · /mine · /story
src/
  data/vocab.js         # 900 từ / 60 chủ đề (gộp từ vocab.js + vocab_batch*.js)
  srs/                  # LÕI THUẦN (có test)
    sm2.js              #   review/preview/isDue/buildSession
    session.js          #   hàng đợi in-memory + thống kê
    cardTypes.js        #   5 kiểu ôn + sinh cloze + auto-chấm
    storage.js stats.js vocabStore.js
  hooks/                # useStudy (phiên+SM-2+lưu) · useVocab (built-in+user)
  ai/                   # chat · whisper · mine · story  (gọi proxy, KHÔNG giữ token)
  components/           # Dashboard · StudySession · RatingBar · DataManager
                        # MiningPanel · MiniStory · VoiceChat
  utils/                # format · voiceMatch
```

**Schema thẻ:** `{ c, v, m, e, d, col }` — `id = c + "::" + v` (suy ra tự động).

---

## 🗺️ Trạng thái

| ✅ Hoàn thành & kiểm chứng | ⏳ Cần môi trường của bạn |
|---|---|
| Học từ (SM-2, đa kiểu, sản xuất) · Dashboard · Mining · Mini-story · Streak · PWA | Luyện nói **live** (cài `whisper.cpp` + token) · Expose qua **Cloudflare Tunnel** |

Lộ trình chi tiết theo milestone **M1–M12**: xem [`TODO.md`](TODO.md). Đặc tả gốc (source of truth): [`Lo_trinh_Spaced_Repetition_Flashcard.md`](Lo_trinh_Spaced_Repetition_Flashcard.md).

---

## 🛠️ Stack

**Vite + React** (JS) · `localStorage` (không DB) · **Vitest** · **vite-plugin-pwa** · **Web Speech API** (TTS, built-in) · **whisper.cpp** (STT local) · proxy Node thuần.

---

<p align="center"><sub>App cá nhân — học cho vui và hiệu quả. 🌱</sub></p>
