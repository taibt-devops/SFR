// Gộp các tuần ĐÃ SOẠN thành khoá học. Tuần chưa soạn chỉ nằm ở `outline.js` (lộ trình).
// Thêm tuần mới: import weekNN.js rồi đẩy vào mảng dưới — không sửa gì khác.
import week01 from "./week01.js";
import week02 from "./week02.js";

export const lessons = [...week01, ...week02].sort((a, b) => a.day - b.day);

// Bài theo số ngày (1-based). Trả undefined nếu tuần đó chưa soạn.
export function lessonByDay(day) {
  return lessons.find((l) => l.day === Number(day));
}

// Số bài đã soạn — dùng cho màn Tiến bộ và để biết khi nào cần soạn tiếp.
export const AUTHORED_DAYS = lessons.length;

export default lessons;
