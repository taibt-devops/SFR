// Trang xem ngọn núi ở nhiều mốc thời gian cùng lúc — mở bằng `?debug=nui`.
//
// Tồn tại vì không thể đợi 365 ngày để biết hình vẽ có vỡ không. Trước khi có trang này tôi chỉ
// nhìn được mốc 2 ngày, và đúng mốc đó thì mọi thứ trông ổn trong khi mốc 100 có thể đã hỏng.
//
// Không phải màn của người học: không vào được từ bất kỳ nút nào, chỉ gõ tay query param.
import Mountain from "./Mountain.jsx";
import { chiaLop } from "../utils/nuiLop.js";

const MOC = [1, 2, 7, 14, 15, 30, 72, 100, 365];

export default function MountainDebug({ onBack }) {
  return (
    <div className="screen">
      <header className="hd">
        <div className="hd-row">
          <span className="hd-label">Debug · ngọn núi</span>
          <button className="btn btn-sm" onClick={onBack}>Thoát</button>
        </div>
      </header>

      <p className="muted small" style={{ margin: 0 }}>
        Mỗi khối là số ngày khác nhau. Kiểm: lớp trên cùng luôn dày và sáng; số lớp không phình ra;
        chiều cao không vượt trần.
      </p>

      {MOC.map((n) => {
        const lop = chiaLop(n);
        return (
          <section key={n} className="dbg-item">
            <div className="dbg-head">
              <b>{n} ngày</b>
              <span className="muted small">
                {lop.length} lớp · dày nhất {Math.max(...lop)}ng · mỏng nhất {Math.min(...lop)}ng
              </span>
            </div>
            <Mountain days={n} total={72} celebrate />
          </section>
        );
      })}

      <div className="spacer" />
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
