// Nguồn dữ liệu built-in: gộp 6 batch ở root (900 từ / 60 chủ đề; mục tiêu ~1000).
// Mỗi batch tự suy ra id = c + "::" + v. Gộp lại + khử trùng id (bản xuất hiện trước thắng) để
// đảm bảo id duy nhất (constraint C2). Bổ sung từ: thêm batch mới vào đây, HOẶC dùng DataManager (B7).
import b1 from "../../vocab.js";
import b2 from "../../vocab_batch2.js";
import b3 from "../../vocab_batch3.js";
import b4 from "../../vocab_batch4.js";
import b5 from "../../vocab_batch5.js";
import b6 from "../../vocab_batch6.js";

const seen = new Set();
export const vocab = [...b1, ...b2, ...b3, ...b4, ...b5, ...b6].filter((card) => {
  if (seen.has(card.id)) return false;
  seen.add(card.id);
  return true;
});
export default vocab;
