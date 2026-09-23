// Ngọn núi của bạn — chỉ số chính của app: TỔNG số ngày đã học.
//
// Vì sao là núi chứ không phải một con số: con số streak tụt về 0 sau một ngày nghỉ, còn núi thì
// KHÔNG BAO GIỜ THẤP ĐI. Nghỉ một tuần quay lại, núi vẫn đúng chiều cao bạn đã xây. Đó chính là
// điều cần nói với người học vào đúng lúc họ dễ bỏ cuộc nhất.
//
// Mỗi ngày thêm một LỚP TRẦM TÍCH: núi cao dần và các vạch ngang dày lên. Ngày 1 vẫn là một quả
// đồi thấy được chứ không phải vạch kẻ — không ai muốn "thành quả" đầu tiên của mình vô hình.

const W = 260;
const H = 132;
const DAY_MIN = 0.2;  // chiều cao ngày đầu, theo tỉ lệ so với núi đầy đủ

export default function Mountain({ days = 0, total = 72, celebrate = false }) {
  const t = total > 0 ? Math.min(1, days / total) : 0;
  // Căn bậc hai: những ngày ĐẦU cho thấy thay đổi rõ nhất. Tăng tuyến tính thì 30 ngày đầu gần
  // như không nhúc nhích, đúng giai đoạn người học cần thấy mình đang đi lên.
  const cao = days === 0 ? 0 : (DAY_MIN + (1 - DAY_MIN) * Math.sqrt(t)) * (H - 16);
  const dinhY = H - cao;
  const chanNua = 22 + cao * 0.62;         // núi cao thì chân rộng ra, giữ dáng cân đối
  const giua = W / 2;

  // Vạch trầm tích: tối đa 9 vạch, thưa dần lên đỉnh. Không vẽ 72 vạch — chỉ thành mảng xám.
  const soVach = Math.min(9, Math.max(0, Math.floor(days / 2)));
  const vach = [];
  for (let i = 1; i <= soVach; i++) {
    const f = i / (soVach + 1);            // 0 = đỉnh, 1 = chân
    const y = dinhY + f * cao;
    const nua = f * chanNua;
    vach.push(<line key={i} x1={giua - nua} y1={y} x2={giua + nua} y2={y} />);
  }

  return (
    <svg
      className={celebrate ? "nui is-celebrate" : "nui"}
      viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
      role="img" aria-label={`Núi của bạn: ${days} ngày`}
    >
      {/* Đường chân trời — để ngày 0 vẫn có thứ để nhìn, không phải khung rỗng */}
      <line className="nui-dat" x1="6" y1={H - 0.5} x2={W - 6} y2={H - 0.5} />

      {days > 0 && (
        <>
          <polygon
            className="nui-than"
            points={`${giua},${dinhY} ${giua + chanNua},${H} ${giua - chanNua},${H}`}
          />
          <g className="nui-vach">{vach}</g>
          {/* Chóp sáng: phần thưởng nhỏ cho việc leo cao, chỉ hiện khi núi đã ra dáng */}
          {t > 0.08 && (
            <polygon
              className="nui-chop"
              points={`${giua},${dinhY} ${giua + chanNua * 0.26},${dinhY + cao * 0.26} ${giua - chanNua * 0.26},${dinhY + cao * 0.26}`}
            />
          )}
        </>
      )}
    </svg>
  );
}
