// Đọc số liệu nhịp nói từ dữ liệu từng-từ của Whisper. THUẦN — không React, không mạng.
//
// Trước đây app chỉ so TÚI TỪ: đúng hay sai. Whisper vẫn luôn trả kèm mốc thời gian và độ tin cậy
// của từng từ, chỉ là ta vứt đi. Có hai thứ đó thì nói được những điều cụ thể hơn hẳn:
// bạn ngập ngừng ở đâu, từ nào máy nghe chật vật nhất, bạn nói nhanh hay chậm.
//
// RANH GIỚI PHẢI GIỮ: `p` là độ tin cậy của BỘ GIẢI MÃ, không phải điểm phát âm. Whisper đoán từ
// bằng cả âm thanh lẫn ngữ cảnh, nên từ dễ đoán vẫn điểm cao dù đọc sai. Mọi câu chữ sinh ra từ
// đây phải nói "máy nghe không chắc", KHÔNG được nói "bạn phát âm sai".

export const NGUONG_YEU = 0.6;   // dưới mức này coi là máy nghe chật vật
export const NGUONG_DUNG = 0.35; // khoảng lặng GIỮA hai từ, tính bằng giây, mới coi là ngập ngừng

const chuThuong = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9']+/g, "");

// Khoảng lặng trước mỗi từ. Trả [{ w, giay }] đã lọc theo ngưỡng, dài nhất lên đầu.
export function nhipNgung(words = [], nguong = NGUONG_DUNG) {
  const out = [];
  for (let i = 1; i < words.length; i++) {
    const g = (words[i].start ?? 0) - (words[i - 1].end ?? 0);
    if (g >= nguong) out.push({ w: words[i].w, giay: Math.round(g * 10) / 10 });
  }
  return out.sort((a, b) => b.giay - a.giay);
}

// Từ máy nghe chật vật nhất. Bỏ qua từ chỉ có một ký tự (a, I) — chúng luôn nhiễu và không dạy
// được gì; báo "bạn đọc chữ 'a' chưa rõ" là lời khuyên vô dụng.
export function tuYeuNhat(words = [], nguong = NGUONG_YEU) {
  const ung = words.filter((x) => typeof x.p === "number" && chuThuong(x.w).length > 1);
  if (!ung.length) return null;
  const min = ung.reduce((a, b) => (b.p < a.p ? b : a));
  return min.p < nguong ? { w: min.w, p: Math.round(min.p * 100) } : null;
}

// Tốc độ nói THẬT: tính trên khoảng từ-đầu tới từ-cuối, không tính thời gian bấm nút và im lặng
// hai đầu. Bản cũ chia cho cả thời lượng ghi âm nên ai bấm nút chậm là bị chấm nói chậm oan.
export function tocDo(words = []) {
  if (words.length < 2) return null;
  const d = (words.at(-1).end ?? 0) - (words[0].start ?? 0);
  if (d <= 0) return null;
  return Math.round(words.length / (d / 60));
}

// Gói gọn cho giao diện. Trả null ở từng trường khi không đủ dữ liệu — chỗ gọi cứ bỏ qua trường
// null, đừng bịa ra số.
export function doNhipNoi(detail) {
  const words = Array.isArray(detail?.words) ? detail.words : [];
  if (!words.length) return null;
  const ngung = nhipNgung(words);
  return {
    soTu: words.length,
    wpm: tocDo(words),
    yeu: tuYeuNhat(words),
    ngungLau: ngung[0] || null,
    soLanNgung: ngung.length,
  };
}

// Gọn lại cho gia sư cuối ngày: đủ để nó thấy dấu vết âm thanh, mà không phình gói gửi đi.
// Chỉ giữ các từ ĐÁNG NGỜ — gửi cả câu thì mỗi buổi là hàng trăm con số vô nghĩa.
export function dauVetAmThanh(detail, gioiHan = 3) {
  const words = Array.isArray(detail?.words) ? detail.words : [];
  const yeu = words
    .filter((x) => typeof x.p === "number" && x.p < NGUONG_YEU && chuThuong(x.w).length > 1)
    .sort((a, b) => a.p - b.p)
    .slice(0, gioiHan)
    .map((x) => ({ w: x.w, p: Math.round(x.p * 100) }));
  return yeu.length ? yeu : null;
}
