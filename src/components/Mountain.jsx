// Ngọn núi của bạn — chỉ số chính của app: TỔNG số ngày đã học.
//
// Streak tụt về 0 sau một ngày nghỉ; núi thì KHÔNG BAO GIỜ THẤP ĐI. Nghỉ một tuần quay lại, núi
// vẫn đúng chiều cao bạn đã xây. Đó là điều cần nói vào đúng lúc người ta dễ bỏ cuộc nhất.
//
// Mỗi ngày là một LỚP VỎ bọc quanh núi cũ, chung chân núi — như vân gỗ. Bản trước xếp chồng lên
// đỉnh, nên lớp hôm nay càng ngày càng mỏng và tới ngày 300 thì biến mất. Bọc quanh thì lớp hôm
// nay LUÔN ở mép ngoài cùng.
//
// Hình học thuần nằm ở `utils/nuiLop.js` (có test). File này chỉ dựng SVG.
import { caoNui, chonMocGop, vanhLop, tiLe, DANG } from "../utils/nuiLop.js";

const f = (v) => Number(v).toFixed(2);

// Đa giác dáng núi ở bán kính `h`, đã thu phóng.
function dang(h, cx, gy, s) {
  return DANG.map(([x, y]) => `${f(cx + x * h * s)},${f(gy - y * h * s)}`).join(" ");
}

// Cây thông giữ KÍCH THƯỚC THẬT qua mọi mốc — nó là cái thước. Núi lớn lên thì cây nhỏ đi so với
// núi, và người xem đọc ra ngay là mình đã đi được bao xa.
function Thong({ x, gy, h, k }) {
  const w = h * 0.36;
  return (
    <g key={k}>
      <polygon points={`${f(x - w)},${f(gy)} ${f(x)},${f(gy - h)} ${f(x + w)},${f(gy)}`} fill="#2B3631" />
      <polygon
        points={`${f(x - w * 0.72)},${f(gy - h * 0.38)} ${f(x)},${f(gy - h * 1.12)} ${f(x + w * 0.72)},${f(gy - h * 0.38)}`}
        fill="#37463D"
      />
    </g>
  );
}

export default function Mountain({
  days = 0,
  vw = 324,
  vh = 124,
  hmax = 110,
  today = false,   // lớp hôm nay vẽ riêng: sáng + quầng + viền
  ghost = false,   // lớp nét đứt "+1": phần thưởng đang chờ, KHÔNG phải lời nhắc nhở
  trees = true,
  celebrate = false,
}) {
  const n = Math.max(0, Math.floor(days));
  const gy = vh - 14;
  const cx = vw / 2;
  const nDinh = n + (ghost ? 1 : 0);
  const s = tiLe(nDinh, { rongKhung: vw, caoToiDa: hmax, coCay: trees });

  // Hôm nay vẽ riêng nên phần "vành cũ" chỉ tính tới hôm qua.
  const cu = today ? n - 1 : n;
  const g = chonMocGop(Math.max(1, cu), s);
  const vanh = vanhLop(cu, g);

  const id = `nui${n}-${vw}`;
  const Ht = caoNui(n);
  const gian = 1.25 * Ht;

  return (
    <svg className={celebrate ? "nui is-celebrate" : "nui"} viewBox={`0 0 ${vw} ${vh}`}
         width="100%" height={vh} role="img" aria-label={`Núi của bạn: ${n} ngày`}>
      {today && (
        <defs>
          <filter id={`${id}b`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={f(Math.max(5, Ht * s * 0.12))} />
          </filter>
          <radialGradient id={`${id}r`}>
            <stop offset="0" stopColor="#C6F432" stopOpacity=".22" />
            <stop offset="1" stopColor="#C6F432" stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {today && n > 0 && (
        <circle cx={cx} cy={f(gy - Ht * s * 0.55)}
                r={f(Math.min(Math.max(62, Ht * s * 1.1), gy - Ht * s * 0.55 - 2, vw / 2))}
                fill={`url(#${id}r)`} />
      )}

      <line x1="8" x2={vw - 8} y1={gy} y2={gy} stroke="#2A2F35" strokeWidth="1" />

      {trees && n > 0 && (
        <>
          <Thong k="p1" x={cx + (gian + 18) * s} gy={gy} h={22 * s} />
          <Thong k="p2" x={cx - (gian + 26) * s} gy={gy} h={15 * s} />
        </>
      )}

      {/* Lớp hôm nay: vẽ TRƯỚC, các vành cũ đè lên trên, nên phần còn thấy chính là viền ngoài. */}
      {today && n > 0 && (
        <g className="nui-nay" style={{ "--r": n > 1 ? Math.sqrt((n - 1) / n).toFixed(3) : "0.3" }}>
          <polygon className="nui-quang" points={dang(Ht, cx, gy, s)} fill="#C6F432" opacity=".55" filter={`url(#${id}b)`} />
          <polygon points={dang(Ht, cx, gy, s)} fill="#C6F432" />
          <polyline points={dang(Ht, cx, gy, s)} fill="none" stroke="#E6FF9C" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      )}

      {/* Vành cũ: NGOÀI vào TRONG, hai sắc lime/teal xen kẽ, càng vào trong càng tối. */}
      {vanh.map((b, i) => {
        const j = vanh.length - 1 - i;
        const t = vanh.length > 1 ? j / (vanh.length - 1) : 1;
        const lime = j % 2 === 0;
        return (
          <polygon key={b} points={dang(caoNui(b), cx, gy, s)}
                   fill={`hsl(${lime ? 82 : 162}, ${lime ? 42 : 30}%, ${(12 + t * 14).toFixed(1)}%)`} />
        );
      })}

      {ghost && (
        <>
          <polyline points={dang(caoNui(n + 1), cx, gy, s)} fill="none" stroke="#C6F432"
                    strokeOpacity=".75" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" />
          <text x={f(cx + 13)} y={f(gy - caoNui(n + 1) * s + 9)} fill="#C6F432"
                fontSize="12" fontWeight="700">+1</text>
        </>
      )}
    </svg>
  );
}
