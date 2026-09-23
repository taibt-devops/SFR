// Hình học ngọn núi. THUẦN — không React, không SVG, để test được riêng.
//
// Mỗi ngày là một LỚP VỎ bọc quanh núi cũ, chung một chân núi — như vân gỗ. Khác hẳn cách xếp
// chồng lên đỉnh mà bản trước dùng: chồng lên đỉnh thì lớp hôm nay càng ngày càng mỏng, tới ngày
// 300 còn chưa tới 1px. Bọc quanh thì lớp hôm nay LUÔN nằm ở mép ngoài cùng, ngày 365 vẫn rõ như
// ngày 3.

export const K_CAO = 38;          // chiều cao = K·√N
export const DAI_TOI_THIEU = 3;   // một dải màu hẹp hơn ngần này thì mắt không thấy nữa
export const MOC_GOP = [1, 7, 30, 90, 365]; // ngày → tuần → tháng → quý → năm

// Diện tích tỉ lệ với số ngày: ngày nào cũng góp một phần BẰNG NHAU. Đó là nghĩa đen của
// "bụi tích thành núi", và cũng là lý do dùng căn bậc hai chứ không phải tuyến tính.
export function caoNui(n) {
  return K_CAO * Math.sqrt(Math.max(0, n || 0));
}

// Chọn mức gộp NHỎ NHẤT mà dải ngoài cùng vẫn còn nhìn thấy được ở tỉ lệ `s` đang vẽ.
// Ranh giới đặt ở bội số cố định (7, 30, 90…) nên các dải không nhảy lung tung mỗi ngày —
// nếu chia đều theo số lớp thì hôm nay và ngày mai sẽ ra hai bức tranh khác hẳn nhau.
export function chonMocGop(recent, s = 1) {
  for (const g of MOC_GOP) {
    const lo = Math.max(0, recent - g);
    if (lo === 0 || (caoNui(recent) - caoNui(lo)) * s >= DAI_TOI_THIEU) return g;
  }
  return MOC_GOP[MOC_GOP.length - 1];
}

// Bán kính từng vành, NGOÀI vào TRONG. Mỗi số là "núi lúc đã học được bấy nhiêu ngày".
// Bỏ qua vành sát mép ngoài mà mỏng hơn nửa mức gộp — nếu không sẽ có một sợi chỉ dính vào
// vành ngoài cùng, trông như lỗi vẽ.
export function vanhLop(recent, g = 1) {
  const n = Math.floor(recent || 0);
  if (n < 1) return [];
  const out = [n];
  for (let m = Math.floor((n - 1) / g) * g; m >= g; m -= g) {
    if (n - m >= g / 2) out.push(m);
  }
  return out;
}

// Dáng núi: [x tương đối, y tương đối] với y=1 là đỉnh, y=0 là mặt đất.
// Lệch một bên và có một bậc vai — núi cân đối tuyệt đối trông như cái nón, không ra núi.
export const DANG = [[-1.25, 0], [0, 1], [0.42, 0.57], [0.58, 0.64], [1.25, 0]];

// Tỉ lệ thu phóng để núi vừa khung. Chạm trần thì LÙI CAMERA chứ không cắt ngọn —
// cắt ngọn là nói dối về chiều cao, lùi camera thì cây thông bên cạnh nhỏ đi và người xem
// đọc ra ngay là núi đã lớn.
export function tiLe(nDinh, { rongKhung, caoToiDa, coCay = true }) {
  const Ht = caoNui(nDinh);
  if (Ht <= 0) return 1;
  const rongNua = 1.25 * Ht + (coCay ? 34 : 4);
  return Math.min(1, caoToiDa / Ht, (rongKhung / 2 - 6) / rongNua);
}
