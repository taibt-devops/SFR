# Thiết kế — Hỏi đáp Việt→Anh (Phần 11)

> Ngày: 2026-09-23 · Branch: `hoi-dap-phan-11`
> Trạng thái: đã duyệt, chờ lên kế hoạch thực thi.

## 1. Vì sao có nó

Hiện app chỉ đi một chiều: chương trình đưa câu, người học nói theo. Nhưng nhu cầu thật hay đến
theo chiều ngược lại — đang ở nhà hàng, trong đầu bật ra tiếng Việt "cho tôi xin hoá đơn", và
**không biết tiếng Anh nói sao**. Lúc đó không có chỗ nào trong app trả lời được.

`/translate` đã có nhưng là Anh→Việt (bấm vào từ lúc luyện nói để hiểu nghĩa). Chiều Việt→Anh chưa
tồn tại.

Quan trọng hơn: câu tra được hiện **không dẫn đi đâu cả**. Thiết kế này biến mỗi lần tra thành một
lần học — câu vừa hỏi có thể nói thử ngay (chấm bằng Whisper) và lưu vào hàng đợi ôn để nó quay lại.

## 2. Người học thấy gì

Nút tròn 💬 góc dưới phải, có mặt ở **mọi màn** (trừ màn đăng nhập). Bấm → mở tấm trượt:

```
Bạn hỏi:  [ cho tôi xin hoá đơn                    ]  →

★ Could I get the bill?
  /kʊd aɪ ɡet ðə bɪl/                              🔊

  Lịch sự, chuẩn nhà hàng. Ở Mỹ hay nói "check" hơn "bill".

  Nói khác: Check, please.  /tʃek pliːz/  🔊   (ngắn, thân mật)

  ┌──────────────┐  ┌──────────────────┐
  │ 🎙️ Nói thử   │  │ ⭐ Lưu vào ôn tập │
  └──────────────┘  └──────────────────┘
```

Khi ô nhập còn trống, dưới ô hiện các câu đã hỏi gần đây dạng chip — bấm vào mở lại kết quả cũ
**không gọi Claude** (câu trả lời được lưu kèm).

## 3. Kiến trúc

Sáu mảnh, mỗi mảnh một việc:

| Mảnh | Việc | Phụ thuộc |
|---|---|---|
| `server/proxy.mjs` → `handleAsk` + route `/ask` | Việt → JSON tiếng Anh | Claude |
| `src/ai/ask.js` | gọi proxy, timeout 20s | `auth.js` |
| `src/srs/ask.js` | kho 20 câu gần nhất + `sanitizeAnswer` | không gì (thuần) |
| `src/components/AskSheet.jsx` | tấm trượt: nhập, kết quả, TTS, nói thử, lưu | `SpeakCheck`, `tts` |
| `src/components/AskFab.jsx` | nút nổi + quản trạng thái mở/đóng | `AskSheet` |
| `src/App.jsx` | gắn FAB lên mọi màn | — |

### 3.1 Route `/ask`

Thêm **đúng một dòng** vào bảng `ROUTES` — không dán đè cả khối (lần trước suýt xoá mất `/coach`
vì dán một ảnh chụp cũ của khối này).

Vào: `{ vi: "<câu tiếng Việt>" }`. Ra:

```json
{
  "en":  "Could I get the bill?",
  "ipa": "/kʊd aɪ ɡet ðə bɪl/",
  "use": "Lịch sự, chuẩn nhà hàng. Ở Mỹ hay nói \"check\" hơn \"bill\".",
  "say": "",
  "alt": { "en": "Check, please.", "ipa": "/tʃek pliːz/", "note": "ngắn, thân mật" }
}
```

Quy ước nội dung, viết thẳng vào system prompt:

- `en` — **một** câu tự nhiên nhất người bản xứ thật sự nói. Không phải bản dịch sát từng chữ.
- `use` — tối đa 2 câu tiếng Việt: trang trọng hay thân mật, dùng ở đâu, khác biệt Anh–Mỹ nếu có.
- `say` — mẹo phát âm **chỉ khi có bẫy thật** (chữ câm, trọng âm hay đặt sai, âm người Việt hay
  nuốt). Không có bẫy thì trả chuỗi rỗng. Thà bỏ trống còn hơn bịa ra mẹo vô nghĩa.
- `alt` — đúng **một** cách nói khác, ở mức trang trọng KHÁC với `en`. `note` ≤ 5 từ.

Hai tình huống lệch chuẩn phải xử lý êm, không báo lỗi:

- Người học gõ nhầm tiếng Anh → vẫn trả lời: coi như họ muốn kiểm tra câu đó, sửa lại cho tự nhiên.
- Câu tiếng Việt mơ hồ ("cho tôi xin") → chọn cách hiểu phổ biến nhất, nói rõ ngữ cảnh đã chọn
  trong `use`.

`maxTokens` ≈ 300.

### 3.2 `src/srs/ask.js` — kho thuần

Khoá localStorage: `srf-ask-v1`. Hình dạng: `[{ vi, a, at }]`, mới nhất đứng đầu, **tối đa 20**.
`a` là nguyên cục câu trả lời đã qua `sanitizeAnswer`.

Xuất: `ASK_KEY`, `loadAsk`, `saveAsk`, `addAsk(store, vi, answer, now)`, `recentAsks(store, n)`,
`sanitizeAnswer(raw)`.

Theo đúng luật của mọi module trong `src/srs/`: không React, không `Date.now()` bên trong (truyền
qua tham số `now`), **không bao giờ mutate tham số**.

`sanitizeAnswer` tồn tại vì LLM có thể trả về bất cứ hình thù gì. Nó ép về đúng khuôn: trường thiếu
→ chuỗi rỗng, `alt` không phải object → `null`, mọi trường ép `String()`. Giao diện sau đó không
cần một câu `if` phòng thủ nào.

Hỏi lại câu đã có (so sánh sau khi chuẩn hoá khoảng trắng + chữ thường + NFC) → đẩy bản ghi cũ lên
đầu và cập nhật câu trả lời, không nhân đôi.

### 3.3 Giao diện

`AskFab` giữ trạng thái đóng/mở và bơm câu trả lời; `AskSheet` chỉ vẽ. Biên giới này để `AskSheet`
kiểm được bằng cách truyền props, không cần giả mạng.

`.screen` nới đáy lên `90px` — nút nổi 52px + lề an toàn sẽ không bao giờ đè lên nội dung hay nút
ở cuối màn. Sửa một chỗ, đúng cho mọi màn.

Trạng thái lỗi: proxy chết / token hết hạn / quá 20s → hiện câu tiếng Việt dễ hiểu + nút "Thử lại".
Đây là bài học từ vụ Whisper treo vô hạn ở màn nói: thiếu timeout thì người dùng ngồi nhìn màn hình
chết mà không biết chuyện gì.

### 3.4 Gắn vào `App.jsx`

`AppMain` hiện có nhiều lệnh `return` sớm (progress / warmup / roleplay / chat / done / switch các
nhịp). Gom chúng vào một hàm lồng sẽ phải thụt lề lại ~130 dòng — diff to, dễ lọt lỗi.

Thay vào đó chèn một tầng `AppShell` mỏng: nó gọi `useLesson()` rồi truyền `L` xuống `AppMain` như
một prop, và đặt `AskFab` cạnh đó.

```jsx
function AppShell() {
  const L = useLesson();
  return (<><AppMain L={L} /><AskFab onAddWord={L.addWord} onAttempt={L.attempt} /></>);
}
```

Sáu dòng, **không thụt lề lại dòng nào**, và `AppMain` chỉ đổi đúng chữ ký hàm.

`useLesson()` phải được gọi **đúng một lần** — gọi ở hai nơi là hai kho trạng thái tách rời, câu
lưu từ nút ⭐ sẽ không bao giờ hiện ra ở nhịp ôn.

Mọi hook còn lại của `AppMain` giữ **nguyên vị trí**, trên mọi `return` có điều kiện. Đẩy hook
xuống dưới là tái phạm đúng lỗi Rules of Hooks đã sửa ở Phần 10 (app crash khi chuyển từ nhịp nói
sang màn đóng ngày).

### 3.5 Nối vào phần đã có — không đẻ thêm kho

Nút ⭐ gọi thẳng `L.addWord({ w: <câu EN>, m: <câu VN đã hỏi>, en: <câu EN> })`.

Đường đi đã có sẵn, không sửa gì: `addMyWord` cất vào ngày đang học → `itemsFor` sinh item ngay
(từ tự thêm là ngoại lệ cố ý của §2.3, không cần học xong bài nào) → `myWordItems` dựng
`variants: [{ vi: câu tiếng Việt, en: câu tiếng Anh }]`.

Hệ quả: hôm sau nhịp ôn hiện **"cho tôi xin hoá đơn"** và bắt nói ra câu tiếng Anh. Đúng chiều tư
duy lúc cần dùng thật.

Nút 🎙️ dùng lại `SpeakCheck` nguyên vẹn với `kind: "ask"`. Attempt chảy vào hồ sơ gia sư như bốn
nhịp kia, nên câu tự tra cũng được tính vào phân tích cuối ngày.

Không viết store mới. Không đụng `sm2.js`.

## 4. Quan hệ với C10 (nói là bắt buộc)

C10 cấm gõ chữ **thay cho** việc nói ở các nhịp luyện nói. Ô nhập ở đây gõ **tiếng Việt** để đặt câu
hỏi, không phải gõ tiếng Anh để né mở miệng — cùng lý do `AddWordModal` được phép có ô chữ.

Nhưng ranh giới này mỏng. Nếu dùng nó để tra câu ngay giữa nhịp nói thay vì cố bật ra, nó thành
đường trốn. Hai thứ giữ ranh giới:

1. Nút 🎙️ **Nói thử** nằm ngay dưới kết quả — tra xong thì nói.
2. Tấm trượt **không bao giờ** nhận hay hiển thị tiếng Anh do người học gõ như một lần "nói".
   Không có đường nào từ ô nhập này ghi được attempt; attempt chỉ sinh từ `SpeakCheck`.

Ghi vào `CLAUDE.md` thành ngoại lệ có điều kiện của C10 — nới luật thì phải nới công khai.

## 5. Ràng buộc khác

- **C7 / bảo mật**: không token ở client. `ai/ask.js` gọi qua proxy như mọi client khác.
- **C8 (toàn cục bộ)**: `/ask` gọi Claude — đúng lối ra Internet duy nhất đã cho phép. Không thêm
  từ điển ngoài, không API phát âm ngoài. Phát âm dùng Kokoro/Web Speech đã có.
- **C9 (ma sát 0)**: FAB không chặn đường vào bài. Không hỏi chủ đề, không hỏi trình độ.

## 6. Kiểm chứng

**Test thuần** (`src/srs/ask.test.js`): giới hạn 20 · hỏi lại thì đẩy lên đầu chứ không nhân đôi ·
JSON hỏng trong localStorage không làm chết app · `sanitizeAnswer` với các hình thù xấu (thiếu
trường, `alt` là mảng, giá trị là số, `null`) · không mutate tham số.

**Gọi thật `/ask`** bằng 3 câu tiếng Việt, trong đó một câu cố tình mơ hồ và một câu gõ nhầm tiếng
Anh. Xem JSON có đúng khuôn và `say` có bỏ trống khi không có bẫy không.

**Trình duyệt**: FAB có mặt ở màn chờ lẫn giữa bài · mở tấm trượt với `/ask` giả lập · bấm ⭐ rồi
đọc `srf-mywords-v1` xác nhận đúng câu vào đúng ngày · 0 lỗi console.

## 7. Xong khi

- [ ] Gõ một câu tiếng Việt ra được câu tiếng Anh + IPA + cách dùng, nghe được cả hai câu.
- [ ] Bấm ⭐ xong, hôm sau nhịp ôn hỏi đúng câu đó theo chiều Việt→Anh.
- [ ] Bấm 🎙️ chấm được phát âm, attempt vào hồ sơ gia sư.
- [ ] Mở lại câu cũ từ chip không phát sinh request mạng nào.
- [ ] Mất mạng / proxy chết → báo lỗi tiếng Việt + nút thử lại, không treo quá 20s.
- [ ] Toàn bộ test cũ vẫn pass (177) + test mới của `srs/ask.js`.
- [ ] `CLAUDE.md` ghi ngoại lệ C10.

## 8. Cố ý KHÔNG làm

- **Không lịch sử vô hạn / không tìm kiếm trong lịch sử.** 20 câu gần nhất đủ; muốn nhớ lâu thì
  bấm ⭐, đó mới là đường đúng.
- ~~**Không hỏi đáp bằng giọng nói.**~~ **ĐÃ LÀM (2026-09-23).** Lý do gác ban đầu — "Whisper đang
  chạy model tiếng Anh" — hoá ra **sai**: container chạy `large-v3`, vốn là model đa ngữ. Chỉ có
  tham số `language=en` cắm cứng trong URL khiến nó chỉ nghe tiếng Anh. Đo trên cùng một audio:
  `language=en` trả `Cho Toi Zin Ho Don`, `language=vi` trả `Cho tôi dân hồ đoàn.` — cùng ~375ms.
  Xem §9.
- **Không giải thích ngữ pháp dài.** `use` tối đa 2 câu. Muốn đào sâu thì đã có nhịp trò chuyện
  với gia sư.

## 9. Nhập bằng giọng nói (bổ sung 2026-09-23)

Nút mic nằm cạnh nút gửi. Nói tiếng Việt → Whisper (`language=vi`) → **điền vào ô**.

Hai giới hạn có chủ ý:

**Chỉ điền, KHÔNG tự gửi.** Độ chính xác của Whisper với tiếng Việt chưa được kiểm bằng giọng người
thật. Tự gửi một câu nghe nhầm là vừa tốn một lượt gọi Claude vừa trả lời một câu không ai hỏi.
Điền ra để mắt soát trước; mũi tên sáng lên ngay cạnh.

**KHÔNG cộng vào "phút nói mỗi ngày"** (`countSpeak: false`). Nói tiếng Việt để tra một câu không
phải luyện nói tiếng Anh. Cộng vào đó là tự thổi phồng đúng cái số liệu đáng lẽ phải trung thực
nhất. Đã kiểm bằng đối chứng: nói ở nhịp luyện nói ghi `spk: 2` giây vào `phrasal-daily-v1`, nói
vào ô hỏi đáp để nguyên `null`.

**Ngoại lệ ghi vào danh sách "không đụng"**: `src/ai/whisper.js` nhận thêm tham số `lang` (mặc định
`"en"`, mọi nơi gọi cũ không đổi hành vi). `src/hooks/useRecorder.js` nhận thêm `{ lang, countSpeak }`.

**Chưa kiểm:** độ chính xác thật khi người Việt nói vào mic. Tôi không có mic, và audio thử nghiệm
là giọng đọc tiếng Anh phát âm chữ Việt nên không phải phép thử công bằng.
