// Ngọn núi của bạn — chỉ số chính của app: TỔNG số ngày đã học.
//
// Vì sao là núi chứ không phải một con số: streak tụt về 0 sau một ngày nghỉ, còn núi thì KHÔNG
// BAO GIỜ THẤP ĐI. Nghỉ một tuần quay lại, núi vẫn đúng chiều cao bạn đã xây.
//
// CHỈ vẽ phần đã tích luỹ — không có viền "núi đầy đủ" phía trước, vì viền đó biến thành tin nhắn
// "còn xa lắm" ngay trên màn ăn mừng.
//
// Lớp: gần đây đếm theo NGÀY, xa hơn gộp theo TUẦN rồi THÁNG (xem `utils/nuiLop.js`). Hai sắc
// lime/teal xen kẽ để đếm được bằng mắt. Lớp trên cùng là hôm nay: luôn sáng, có độ dày tối thiểu
// nên ở ngày thứ 300 nó vẫn thấy được chứ không mỏng thành một nét kẻ.
import { chiaLop } from "../utils/nuiLop.js";

const W = 240;
const LE = 8;          // lề dưới chừa cho đường chân trời
const CAO_MIN = 30;    // ngày đầu tiên vẫn phải là một quả đồi thấy được, không phải vạch kẻ
const CAO_MAX = 112;   // trần cứng: 365 ngày cũng không được phá vỡ bố cục
const DOC = 1.15;      // độ dốc — nửa chân núi = cao × DOC
const DAY_NAY = 8;     // độ dày TỐI THIỂU của lớp hôm nay

export default function Mountain({ days = 0, total = 72, celebrate = false }) {
  const n = Math.max(0, Math.floor(days));
  if (n === 0) {
    return (
      <svg className="nui" viewBox={`0 0 ${W} ${CAO_MIN}`} width="100%" height={CAO_MIN}
           preserveAspectRatio="xMidYMax meet" role="img" aria-label="Chưa có ngày nào">
        <line className="nui-dat" x1="0" y1={CAO_MIN - 0.5} x2={W} y2={CAO_MIN - 0.5} />
      </svg>
    );
  }

  // Căn bậc hai: những ngày ĐẦU cho thấy thay đổi rõ nhất. Tăng tuyến tính thì 30 ngày đầu gần
  // như không nhúc nhích — đúng giai đoạn người học cần thấy mình đang đi lên.
  const cao = Math.min(CAO_MAX, CAO_MIN + (CAO_MAX - CAO_MIN) * Math.sqrt(Math.min(1, n / total)));
  // Khung CO THEO núi thay vì cao cố định, nếu không thì ngày thứ 2 là một quả đồi trôi giữa
  // khoảng trống — nhìn như lỗi hiển thị.
  const H = Math.ceil(cao) + LE;
  const giua = W / 2;
  const chan = Math.min(giua - 4, cao * DOC);

  const lop = chiaLop(n);
  // Lớp hôm nay lấy phần dày tối thiểu TRƯỚC, phần còn lại chia đều cho các lớp cũ. Chia đều theo
  // SỐ LỚP chứ không theo số ngày: chia theo ngày thì một lớp "tháng" dày gấp 30 lần lớp "ngày",
  // và mọi lớp gần đây teo thành nét kẻ — đúng thứ việc gộp lớp sinh ra để tránh.
  const dayNay = Math.max(DAY_NAY, cao / lop.length);
  const dayCu = lop.length > 1 ? (cao - dayNay) / (lop.length - 1) : 0;

  const nua = (y) => (chan * (y - (H - cao))) / cao; // nửa chiều rộng ở độ cao y

  const hinh = [];
  let y = H; // đi từ mặt đất lên
  for (let i = 0; i < lop.length; i++) {
    const homNay = i === lop.length - 1;
    const d = homNay ? dayNay : dayCu;
    const yT = y;
    const yD = y - d;
    hinh.push(
      <polygon
        key={i}
        className={`nui-lop ${i % 2 ? "b" : "a"}${homNay ? " nay" : ""}`}
        points={`${giua - nua(yD)},${yD} ${giua + nua(yD)},${yD} ${giua + nua(yT)},${yT} ${giua - nua(yT)},${yT}`}
      />
    );
    y = yD;
  }

  return (
    <svg
      className={celebrate ? "nui is-celebrate" : "nui"}
      viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
      preserveAspectRatio="xMidYMax meet"
      role="img" aria-label={`Núi của bạn: ${n} ngày, xếp thành ${lop.length} lớp`}
    >
      <g className="nui-than">{hinh}</g>
      <line className="nui-dat" x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} />
    </svg>
  );
}
