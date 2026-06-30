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

// So câu người học nói (heard) với câu mục tiêu (target) ở mức từ (bag-of-words, "tương đối").
// Trả mảng { word, ok } theo thứ tự từ trong target — từ nào không nghe thấy → ok=false.
export function diffWords(target, heard) {
  const heardSet = new Set(String(heard).split(/\s+/).map(key).filter(Boolean));
  return String(target)
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => ({ word: tok, ok: heardSet.has(key(tok)) }));
}
