// Khởi động nói 1 phút mỗi ngày (đề xuất #5): lưu lịch sử {at, words, seconds, wpm, fillers}
// (số liệu từ utils/fluency.speechStats — KHÔNG gọi Claude). Thuần trừ localStorage I/O;
// nhận `now` từ ngoài để test tất định. KHÔNG đụng SM-2.
export const WARMUP_KEY = "phrasal-warmup-v1";
const MAX = 60; // giữ ~2 tháng gần nhất

// Mốc 00:00 (giờ địa phương) → so "cùng ngày" (giống stats.js).
function dayStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Thêm 1 lần khởi động (mới nhất ở ĐẦU, như speaking.js). Trả mảng mới, không mutate.
export function addWarmup(list, entry) {
  return [entry, ...(list || [])].slice(0, MAX);
}

// Đã khởi động hôm nay chưa (theo `now`).
export function warmupToday(list, now) {
  return (list || []).some((e) => dayStart(e.at) === dayStart(now));
}

// Trend cho biểu đồ: n NGÀY gần nhất có tập (mỗi ngày lấy lần TỐT nhất theo wpm), cũ → mới.
export function warmupTrend(list, n = 7) {
  const byDay = new Map();
  for (const e of list || []) {
    const d = dayStart(e.at);
    const cur = byDay.get(d);
    if (!cur || (e.wpm || 0) > (cur.wpm || 0)) byDay.set(d, e);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-n)
    .map(([day, e]) => ({ day, wpm: e.wpm || 0, fillers: e.fillers || 0 }));
}

export function loadWarmup() {
  try {
    const v = JSON.parse(localStorage.getItem(WARMUP_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveWarmup(list) {
  try {
    localStorage.setItem(WARMUP_KEY, JSON.stringify(list));
  } catch {
    /* localStorage không khả dụng — bỏ qua */
  }
}
