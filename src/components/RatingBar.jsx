// 4 nút đánh giá, mỗi nút kèm khoảng cách ôn kế tiếp (xem trước qua preview()).
// Thuần presentational. `suggestedQ` (tùy chọn): kết quả auto-chấm gợi ý — KHÔNG ép, người học vẫn quyết.
import { preview } from "../srs/sm2.js";

const BUTTONS = [
  { q: 2, lab: "Chưa nhớ", cls: "r-again" },
  { q: 3, lab: "Khó", cls: "r-hard" },
  { q: 4, lab: "Tốt", cls: "r-good" },
  { q: 5, lab: "Dễ", cls: "r-easy" },
];

function intervalLabel(state, q) {
  if (q < 3) return "lại"; // quên → gặp lại trong phiên (due lưu = +1 ngày)
  const d = preview(state, q);
  return d === 1 ? "1 ngày" : `${d} ngày`;
}

export default function RatingBar({ state, onRate, suggestedQ = null }) {
  return (
    <>
      <div className="rate-hint">Bạn nhớ từ này tới mức nào?</div>
      <div className="rate-row">
        {BUTTONS.map((b) => (
          <button
            key={b.q}
            className={`rate ${b.cls}${suggestedQ === b.q ? " rate-suggest" : ""}`}
            onClick={() => onRate(b.q)}
          >
            <span className="r-lab">{b.lab}</span>
            <span className="r-int">{intervalLabel(state, b.q)}</span>
          </button>
        ))}
      </div>
      <div className="kbd-hint">phím 1–4 để đánh giá</div>
    </>
  );
}
