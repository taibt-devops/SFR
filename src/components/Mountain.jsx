// Ngọn núi của bạn — chỉ số chính của app: TỔNG số ngày đã học.
//
// Vì sao là núi chứ không phải một con số: streak tụt về 0 sau một ngày nghỉ, còn núi thì KHÔNG
// BAO GIỜ THẤP ĐI. Nghỉ một tuần quay lại, núi vẫn đúng chiều cao bạn đã xây.
//
// CHỈ vẽ phần đã tích luỹ — không có viền "núi đầy đủ" phía trước. Bản trước tôi vẽ bóng mờ của
// cả 72 ngày để khung khỏi trống, nhưng nó biến thành tin nhắn "còn xa lắm" ngay trên màn ăn mừng.
// Mỗi ngày là MỘT LỚP, hai sắc lime/teal xen kẽ nên đếm được bằng mắt là mình đã xếp bao nhiêu.

const W = 240;
const H = 132;
const CAO_MIN = 30;    // ngày đầu tiên vẫn phải là một quả đồi thấy được, không phải vạch kẻ
const CAO_MAX = 112;   // trần cứng: 72 ngày cũng không được phá vỡ bố cục
const DOC = 1.15;      // độ dốc — nửa chân núi = cao × DOC

export default function Mountain({ days = 0, total = 72, celebrate = false }) {
  const n = Math.max(0, Math.floor(days));
  if (n === 0) {
    return (
      <svg className="nui" viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
           preserveAspectRatio="xMidYMax meet" role="img" aria-label="Chưa có ngày nào">
        <line className="nui-dat" x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} />
      </svg>
    );
  }

  // Căn bậc hai: những ngày ĐẦU cho thấy thay đổi rõ nhất. Tăng tuyến tính thì 30 ngày đầu gần
  // như không nhúc nhích — đúng giai đoạn người học cần thấy mình đang đi lên.
  const cao = Math.min(CAO_MAX, CAO_MIN + (CAO_MAX - CAO_MIN) * Math.sqrt(Math.min(1, n / total)));
  const giua = W / 2;
  const chan = Math.min(giua - 4, cao * DOC);
  const dayLop = cao / n;

  // Nửa chiều rộng ở độ cao y: 0 ở đỉnh, `chan` ở mặt đất.
  const nua = (y) => (chan * (y - (H - cao))) / cao;

  const lop = [];
  for (let i = 0; i < n; i++) {
    const yD = H - (i + 1) * dayLop; // mép trên của lớp thứ i
    const yT = H - i * dayLop;       // mép dưới
    const wD = nua(yD), wT = nua(yT);
    const homNay = i === n - 1;
    lop.push(
      <polygon
        key={i}
        className={`nui-lop ${i % 2 ? "b" : "a"}${homNay ? " nay" : ""}`}
        points={`${giua - wD},${yD} ${giua + wD},${yD} ${giua + wT},${yT} ${giua - wT},${yT}`}
      />
    );
  }

  return (
    <svg
      className={celebrate ? "nui is-celebrate" : "nui"}
      viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
      preserveAspectRatio="xMidYMax meet"
      role="img" aria-label={`Núi của bạn: ${n} ngày`}
    >
      <g className="nui-than">{lop}</g>
      <line className="nui-dat" x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} />
    </svg>
  );
}
