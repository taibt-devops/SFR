// Bắt rác mà Whisper bịa ra khi nghe tiếng Việt (spec §11.8).
//
// Whisper học tiếng Việt phần lớn từ phụ đề YouTube, nên khi KHÔNG nghe ra gì nó không im lặng —
// nó tuôn ra mấy câu kết video quen thuộc. Đo được thật: một đoạn audio vô nghĩa cho ra
// "Cảm ơn các bạn đã theo dõi và hẹn gặp lại." và "Hãy subscribe cho kênh La La School".
//
// Dán thẳng mấy câu đó vào ô hỏi là tệ hơn cả không nghe được: người dùng tưởng máy nghe ra thật.
// THUẦN, không React, không mạng — để test được.

// Dấu hiệu nhận ra. So sau khi bỏ dấu + chữ thường nên không phụ thuộc cách gõ dấu.
const RAC = [
  "dang ky kenh",
  "dang ki kenh",
  "subscribe",
  "cam on cac ban da theo doi",
  "cam on cac ban da xem",
  "hen gap lai",
  "chao tam biet cac ban",
  "chuc cac ban xem video",
  "ghien mi go",
  "bam chuong",
  "like va chia se",
  "nho like",
];

// Bỏ dấu tiếng Việt về chữ thường không dấu.
export function boDau(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// true = KHÔNG dùng được, nên báo "chưa nghe rõ" thay vì dán vào ô.
export function isAsrJunk(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  const p = boDau(t);
  if (RAC.some((r) => p.includes(r))) return true;
  // Chỉ còn dấu câu / ký tự lạ, không có chữ cái nào.
  if (!/[a-z]/.test(p)) return true;
  return false;
}
