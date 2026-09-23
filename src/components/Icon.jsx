// Bộ icon nét, vẽ theo đúng hình học lucide (khung 24×24, stroke 2, đầu bo tròn).
//
// Tự vẽ thay vì thêm `lucide-react`: repo đang không có dependency nào ngoài React, và ở đây chỉ
// cần đúng 8 hình. Thêm một thư viện icon cho 8 hình là đổi một file lấy một cây phụ thuộc.
//
// Dùng icon nét thay emoji vì emoji do HỆ ĐIỀU HÀNH vẽ: mỗi máy một kiểu, có cái 3D bóng loáng
// (cái loa 🔊 trên Android là ví dụ), không theo được tông tối + lime của app và không đổi màu
// theo trạng thái được.

function Svg({ size = 20, children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IcoVolume = (p) => (
  <Svg {...p}><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></Svg>
);
export const IcoVolumeOff = (p) => (
  <Svg {...p}><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></Svg>
);
export const IcoPlay = (p) => (
  <Svg {...p}><path d="M6 4.5v15l13-7.5-13-7.5Z" /></Svg>
);
export const IcoMasks = (p) => (
  <Svg {...p}><path d="M3 5h10v7a5 5 0 0 1-10 0V5Z" /><path d="M6 8.5h.01M10 8.5h.01" /><path d="M13 7h8v5a5 5 0 0 1-8 4" /><path d="M17 10h.01" /></Svg>
);
export const IcoChat = (p) => (
  <Svg {...p}><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /></Svg>
);
export const IcoArrow = (p) => (
  <Svg {...p}><path d="M4 12h14M12 5l7 7-7 7" /></Svg>
);
export const IcoCheck = (p) => (
  <Svg {...p}><path d="M4 12.5 9.5 18 20 6" /></Svg>
);
// FAB tra từ: hai chữ cái chồng nhau = "câu này nói sao" — khác hẳn bong bóng chat.
export const IcoTranslate = (p) => (
  <Svg {...p}><path d="M3 6h10M8 4v2M11 6a10 10 0 0 1-7 9" /><path d="M6.5 11.5A8 8 0 0 0 12 15" /><path d="m13 20 4-10 4 10M14.6 17h4.8" /></Svg>
);
