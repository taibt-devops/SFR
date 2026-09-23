// Trang xem ngọn núi ở nhiều mốc thời gian cùng lúc — mở bằng `?debug=nui`.
//
// Tồn tại vì không thể đợi 365 ngày để biết hình vẽ có vỡ không. Nó đã trả công một lần: nhìn cả
// dải mốc cạnh nhau mới lộ ra chuyện núi NGỪNG CAO sau ngày 72 — các con số đo riêng từng mốc
// đều "đạt" và không hề nói lên điều đó.
//
// Không phải màn của người học: không vào được từ bất kỳ nút nào, chỉ gõ tay query param.
import Mountain from "./Mountain.jsx";
import { caoNui, chonMocGop, vanhLop, tiLe } from "../utils/nuiLop.js";

const MOC = [1, 2, 7, 14, 30, 72, 100, 365, 1000];
const TEN_GOP = { 1: "ngày", 7: "tuần", 30: "tháng", 90: "quý", 365: "năm" };

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
        Kiểm: lớp ngoài cùng (hôm nay) luôn thấy được · số vành không phình ra ·
        núi vẫn cao lên sau mốc 72 · chạm trần thì thu nhỏ chứ không cắt ngọn.
      </p>

      {MOC.map((n) => {
        const s = tiLe(n, { rongKhung: 324, caoToiDa: 110 });
        const g = chonMocGop(Math.max(1, n - 1), s);
        const v = vanhLop(n - 1, g);
        const daiNgoai = v.length > 1 ? (caoNui(v[0]) - caoNui(v[1])) * s : null;
        return (
          <section key={n} className="dbg-item">
            <div className="dbg-head">
              <b>{n} ngày</b>
              <span className="muted small">
                cao {Math.round(caoNui(n) * s)}px · ×{s.toFixed(2)} · theo {TEN_GOP[g]} ·{" "}
                {v.length + 1} vành{daiNgoai ? ` · dải ngoài ${daiNgoai.toFixed(1)}px` : ""}
              </span>
            </div>
            <Mountain days={n} today celebrate />
          </section>
        );
      })}

      <div className="spacer" />
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
