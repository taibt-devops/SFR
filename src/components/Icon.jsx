// Bộ icon nét, vẽ theo đúng hình học lucide (khung 24×24, stroke 2, đầu bo tròn).
//
// Tự vẽ thay vì thêm `lucide-react`: repo đang không có dependency nào ngoài React, và ở đây chỉ
// cần vài chục hình. Thêm một thư viện icon cho ngần này hình là đổi một file lấy một cây phụ thuộc.
//
// Dùng icon nét thay emoji vì emoji do HỆ ĐIỀU HÀNH vẽ: mỗi máy một kiểu, có cái 3D bóng loáng
// (cái loa 🔊 trên Android là ví dụ rõ nhất), không theo được tông tối + lime của app, và không
// đổi màu theo trạng thái được. Icon ở đây ăn `currentColor` nên nó luôn cùng màu với chữ bên cạnh.

function Svg({ size = 20, fill = "none", children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size}
      fill={fill} stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      style={{ flex: "none" }}
      {...rest}
    >
      {children}
    </svg>
  );
}

// ── Âm thanh ──
export const IcoVolume = (p) => (
  <Svg {...p}><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></Svg>
);
export const IcoVolumeOff = (p) => (
  <Svg {...p}><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></Svg>
);
export const IcoPlay = (p) => (
  <Svg {...p}><path d="M6 4.5v15l13-7.5-13-7.5Z" /></Svg>
);

// ── Ghi âm ──
export const IcoMic = (p) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>
);
export const IcoStop = (p) => (
  <Svg {...p} fill="currentColor" strokeWidth="0"><rect x="6" y="6" width="12" height="12" rx="2.5" /></Svg>
);

// ── Điều hướng ──
export const IcoArrow = (p) => (
  <Svg {...p}><path d="M4 12h14M12 5l7 7-7 7" /></Svg>
);
export const IcoBack = (p) => (
  <Svg {...p}><path d="M20 12H6M12 5l-7 7 7 7" /></Svg>
);
export const IcoClose = (p) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const IcoSend = (p) => (
  <Svg {...p} strokeWidth="2.6"><path d="M4 12h14M12 5l7 7-7 7" /></Svg>
);
export const IcoRedo = (p) => (
  <Svg {...p}><path d="M3 11a9 9 0 1 1 2.6 6.4" /><path d="M3 5v6h6" /></Svg>
);
export const IcoShuffle = (p) => (
  <Svg {...p}><path d="M3 6h4l10 12h4M3 18h4l3-3.6M14 8.6 17 6h4" /><path d="m18 3 3 3-3 3M18 15l3 3-3 3" /></Svg>
);

// ── Trạng thái ──
export const IcoCheck = (p) => (
  <Svg {...p}><path d="M4 12.5 9.5 18 20 6" /></Svg>
);
export const IcoWarn = (p) => (
  <Svg {...p}><path d="M12 3.5 22 20H2L12 3.5Z" /><path d="M12 10v4M12 17h.01" /></Svg>
);
export const IcoWrench = (p) => (
  <Svg {...p}><path d="M15.5 3a5.5 5.5 0 0 0-4.9 8L3 18.6 5.4 21l7.6-7.6A5.5 5.5 0 1 0 15.5 3Z" /><path d="M16 8h.01" /></Svg>
);
export const IcoTarget = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></Svg>
);
export const IcoStar = (p) => (
  <Svg {...p}><path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.2-5.4-2.9-5.4 2.9 1-6.2L3.2 10l6.1-.9L12 3.5Z" /></Svg>
);
export const IcoBulb = (p) => (
  <Svg {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.8.5 1.1v1h6v-1c0-.3.1-.8.5-1.1A6 6 0 0 0 12 3Z" /></Svg>
);
export const IcoUp = (p) => (
  <Svg {...p}><path d="M4 17 10 11l4 4 6-6" /><path d="M15 9h5v5" /></Svg>
);
export const IcoDown = (p) => (
  <Svg {...p}><path d="M4 7 10 13l4-4 6 6" /><path d="M15 15h5v-5" /></Svg>
);
export const IcoDot = (p) => (
  <Svg {...p} fill="currentColor" strokeWidth="0"><circle cx="12" cy="12" r="3.5" /></Svg>
);
export const IcoClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
);

// ── Luyện nói ──
export const IcoMasks = (p) => (
  <Svg {...p}><path d="M3 5h10v7a5 5 0 0 1-10 0V5Z" /><path d="M6 8.5h.01M10 8.5h.01" /><path d="M13 7h8v5a5 5 0 0 1-8 4" /><path d="M17 10h.01" /></Svg>
);
export const IcoChat = (p) => (
  <Svg {...p}><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /></Svg>
);
// Tra Việt→Anh: hai hệ chữ chồng nhau — khác hẳn bong bóng chat.
export const IcoTranslate = (p) => (
  <Svg {...p}><path d="M3 6h10M8 4v2M11 6a10 10 0 0 1-7 9" /><path d="M6.5 11.5A8 8 0 0 0 12 15" /><path d="m13 20 4-10 4 10M14.6 17h4.8" /></Svg>
);
