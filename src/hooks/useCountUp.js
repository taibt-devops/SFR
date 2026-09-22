// Đếm số lên khi vào màn — con số nhảy khiến tiến độ có cảm giác ĐANG tăng, thay vì nằm im.
// Dùng cho streak và số mẫu câu đã nắm. Tôn trọng prefers-reduced-motion (hiện thẳng số cuối).
import { useEffect, useState } from "react";

export function useCountUp(target, { duration = 700, delay = 0 } = {}) {
  const end = Number(target) || 0;
  const [n, setN] = useState(end);

  useEffect(() => {
    if (end <= 0 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setN(end);
      return;
    }
    let raf = 0;
    let t0 = 0;
    setN(0);
    const tick = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // chậm dần ở cuối
      setN(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [end, duration, delay]);

  return n;
}
