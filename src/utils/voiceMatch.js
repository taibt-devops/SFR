// So khớp lời nói (transcript) với từ/câu mục tiêu — cho voice missions (§5.4) & phát âm (§5.5).
// THUẦN, không React. Khớp "tương đối": bỏ hoa thường + dấu câu; KHÔNG dùng để chấm SM-2.

// Chuẩn hoá transcript thành chuỗi có đệm khoảng trắng 2 đầu → kiểm tra ranh giới từ/cụm.
function padded(s) {
  return " " + String(s).toLowerCase().replace(/[^a-z0-9']+/g, " ").replace(/\s+/g, " ").trim() + " ";
}
// Khoá so sánh 1 token: chỉ giữ chữ/số/'.
function key(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9']/g, "");
}

// Trong các từ due, từ/cụm nào THỰC SỰ xuất hiện trong lời nói (dạng nguyên văn). Trả mảng từ khớp.
export function matchSpoken(transcript, words = []) {
  const t = padded(transcript);
  return words.filter((w) => {
    const p = padded(w).trim();
    return p && t.includes(" " + p + " ");
  });
}

// Tách một token thành các mảnh so sánh được: cắt ở dấu gạch nối.
//
// Whisper KHÔNG xuất dấu gạch nối. Người học đọc đúng hoàn toàn "I've been binge-watching movies."
// thì Whisper trả "I've been binge watching movies." — bản cũ ghép thành khoá "bingewatching",
// không thấy trong lời nghe được, nên tô đỏ và báo "Gần đúng". Người dùng thật gặp lỗi này, và nó
// đánh cả vào nội dung chính thức: `double-check` (tuần 1) và `sci-fi` (tuần 2).
function manh(tok) {
  return String(tok).split(/[-–—]/).map(key).filter(Boolean);
}

// So câu người học nói (heard) với câu mục tiêu (target) ở mức từ (bag-of-words, "tương đối").
// Trả mảng { word, ok } theo thứ tự từ trong target — từ nào không nghe thấy → ok=false.
// `word` GIỮ NGUYÊN dấu gạch nối để hiển thị; chỉ khâu SO SÁNH mới nới lỏng.
export function diffWords(target, heard) {
  const heardSet = new Set(String(heard).split(/\s+/).flatMap(manh));
  return String(target)
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const ms = manh(tok);
      // Từ ghép chỉ đúng khi nghe đủ MỌI mảnh — nghe "watching" mà thiếu "binge" thì vẫn là
      // nói thiếu, phải báo sai.
      return { word: tok, ok: ms.length > 0 && ms.every((m) => heardSet.has(m)) };
    });
}
