// Pháo giấy cho màn đóng ngày — canvas nhỏ, tự vẽ, không thư viện, không asset (C8).
// Chạy đúng một lần rồi tự dừng; tôn trọng prefers-reduced-motion.
import { useEffect, useRef } from "react";

const COLORS = ["#c8fa3c", "#ff7a2f", "#6ee787", "#eef1f4"];

export default function Burst({ count = 46 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);

    // Bắn từ 1/3 trên màn, toả đều rồi rơi xuống.
    const ox = w / 2;
    const oy = h * 0.32;
    const bits = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = 2.6 + Math.random() * 4.4;
      return {
        x: ox, y: oy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 2.2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: 4 + Math.random() * 5,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      };
    });

    let raf = 0;
    let frame = 0;
    const MAX = 110; // ~1.8s ở 60fps rồi biến mất, không lởn vởn

    const draw = () => {
      frame++;
      g.clearRect(0, 0, w, h);
      const fade = Math.max(0, 1 - frame / MAX);
      for (const b of bits) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.14; // trọng lực
        b.vx *= 0.99;
        b.rot += b.vr;
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.rot);
        g.globalAlpha = fade;
        g.fillStyle = b.color;
        g.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
        g.restore();
      }
      if (frame < MAX) raf = requestAnimationFrame(draw);
      else g.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return <canvas className="burst" ref={ref} aria-hidden="true" />;
}
