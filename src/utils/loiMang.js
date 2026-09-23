// Dịch lỗi mạng/máy chủ sang câu người dùng hiểu được. THUẦN — không React, không mạng.
//
// Gom một chỗ vì đã có hai bản sao (ô hỏi đáp và màn từ vựng) và chúng bắt đầu lệch nhau: một
// bản mất mấy ranh giới từ trong regex nên `/401|403/` khớp cả "1401". Hai bản dịch lỗi là hai
// chỗ để chúng nói hai kiểu về cùng một sự cố.
//
// Người học không cần biết "proxy lỗi 500" nghĩa là gì — họ cần biết NÊN LÀM GÌ tiếp. Chuỗi kỹ
// thuật chỉ còn nằm trong ngoặc ở cuối, cho lúc cần báo lỗi.
export function loiTiengViet(e, viecDangLam = "") {
  const raw = String(e?.message || e || "");
  if (e?.name === "AbortError") return "Máy chủ không trả lời. Thử lại nhé.";
  if (/\b(401|403)\b/.test(raw)) return "Mật khẩu không còn hiệu lực — đăng nhập lại giúp tôi.";
  if (/\b5\d\d\b/.test(raw)) return "Máy chủ đang trục trặc. Đợi một chút rồi thử lại.";
  if (/failed to fetch|networkerror|load failed/i.test(raw)) return "Không kết nối được máy chủ. Kiểm tra mạng nhé.";
  return (viecDangLam || "Chưa xong") + ", thử lại nhé. (" + raw + ")";
}
