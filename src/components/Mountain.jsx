// Ngọn núi của bạn — chỉ số chính của app: TỔNG số ngày đã học.
//
// Vì sao là núi chứ không phải một con số: streak tụt về 0 sau một ngày nghỉ, còn núi thì KHÔNG
// BAO GIỜ THẤP ĐI. Nghỉ một tuần quay lại, núi vẫn đúng chiều cao bạn đã xây. Đó chính là điều
// cần nói với người học vào đúng lúc họ dễ bỏ cuộc nhất.
//
// Hai lớp: BÓNG MỜ là ngọn núi đầy đủ của cả khoá, PHẦN ĐẶC là chỗ bạn đã leo tới, dâng từ chân
// lên. Bản đầu chỉ vẽ phần đặc và cho nó to dần — ngày thứ 2 ra một tam giác bé tí lọt thỏm giữa
// khung trống, nhìn như lỗi hiển thị. Có bóng mờ thì khung luôn đầy, và ngày đầu tiên đã thấy
// mình đang ở đâu trên cả chặng đường.

const W = 240;
const H = 116;
const CHAN = 104;      // nửa chiều rộng chân núi
const DINH_Y = 10;
const CAO = H - DINH_Y;

export default function Mountain({ days = 0, total = 72, celebrate = false }) {
  const t = total > 0 ? Math.min(1, Math.max(0, days / total)) : 0;
  // Căn bậc hai: những ngày ĐẦU cho thấy thay đổi rõ nhất. Tăng tuyến tính thì 30 ngày đầu gần
  // như không nhúc nhích — đúng giai đoạn người học cần thấy mình đang đi lên.
  const phan = days === 0 ? 0 : Math.max(0.1, Math.sqrt(t));
  const mucY = H - CAO * phan;           // mặt trên của phần đã leo
  const giua = W / 2;
  const silhouette = `${giua},${DINH_Y} ${giua + CHAN},${H} ${giua - CHAN},${H}`;

  // Vạch trầm tích trong phần đã leo — tối đa 7, thưa dần lên đỉnh. Không vẽ 72 vạch: thành mảng xám.
  const soVach = Math.min(7, Math.max(0, Math.floor(days / 3)));
  const vach = [];
  for (let i = 1; i <= soVach; i++) {
    const y = mucY + ((H - mucY) * i) / (soVach + 1);
    const nua = (CHAN * (y - DINH_Y)) / CAO;
    vach.push(<line key={i} x1={giua - nua} y1={y} x2={giua + nua} y2={y} />);
  }

  const id = `nui-clip-${total}`;
  return (
    <svg
      className={celebrate ? "nui is-celebrate" : "nui"}
      viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
      preserveAspectRatio="xMidYMax meet"
      role="img" aria-label={`Núi của bạn: ${days} / ${total} ngày`}
    >
      <defs>
        <clipPath id={id}>
          <polygon points={silhouette} />
        </clipPath>
      </defs>

      {/* Cả chặng đường — luôn hiện, nên khung không bao giờ trống */}
      <polygon className="nui-mo" points={silhouette} />

      {days > 0 && (
        <g clipPath={`url(#${id})`}>
          <rect className="nui-than" x="0" y={mucY} width={W} height={H - mucY} />
          <g className="nui-vach">{vach}</g>
          {/* Vạch sáng ở mặt trên: "bạn đang ở đây" */}
          <line className="nui-muc" x1="0" y1={mucY} x2={W} y2={mucY} />
        </g>
      )}

      <line className="nui-dat" x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} />
    </svg>
  );
}
