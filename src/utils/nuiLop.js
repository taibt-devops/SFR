// Chia N ngày thành các LỚP của ngọn núi. THUẦN, không React, không SVG — tách ra để test được
// riêng, vì đây là chỗ duy nhất có logic thật trong cả hình vẽ.
//
// Vì sao phải gộp: "mỗi ngày một lớp" đọc rất hay ở ngày thứ 5, nhưng tới ngày 365 thì 365 lớp
// trong một hình cao 112px cho ra 0.3px mỗi lớp — tức là một mảng màu phẳng, không lớp nào thấy
// được. Gộp lớp cũ lại giữ cho mỗi vạch vẫn nhìn ra, và vẫn đúng câu chuyện: gần đây đếm theo
// NGÀY, xa hơn nhớ theo TUẦN, xa nữa nhớ theo THÁNG.

export const NGAY_LE = 7;      // số ngày gần nhất luôn giữ nguyên từng ngày
export const NGUONG_NGAY = 14; // dưới mốc này thì không gộp gì cả
export const TUAN_TOI_DA = 12; // quá 12 tuần thì phần cũ hơn gộp tiếp theo tháng
export const NGAY_TUAN = 7;
export const NGAY_THANG = 30;

// Chia `total` ngày thành từng khối `size`, khối LẺ nằm đầu (tức là cũ nhất).
// Để phần dư rơi vào nhóm cũ nhất, không phải nhóm mới nhất — nhóm mới phải luôn là một tuần/tháng
// tròn trịa thì mắt mới đọc được nhịp.
function chia(total, size) {
  const out = [];
  let con = total;
  const du = con % size;
  if (du) { out.push(du); con -= du; }
  while (con > 0) { out.push(size); con -= size; }
  return out;
}

// Trả mảng "số ngày mỗi lớp", CŨ NHẤT trước → MỚI NHẤT sau.
// Tổng các phần tử luôn đúng bằng `days`.
export function chiaLop(days) {
  const n = Math.max(0, Math.floor(days || 0));
  if (n === 0) return [];
  if (n <= NGUONG_NGAY) return Array(n).fill(1);

  const gan = Array(NGAY_LE).fill(1);
  let cu = n - NGAY_LE;

  const suc = TUAN_TOI_DA * NGAY_TUAN; // số ngày tối đa còn được kể theo tuần
  if (cu <= suc) return [...chia(cu, NGAY_TUAN), ...gan];

  // Quá sức chứa của phần tuần: phần cũ NHẤT lùi về đơn vị tháng.
  return [...chia(cu - suc, NGAY_THANG), ...chia(suc, NGAY_TUAN), ...gan];
}
