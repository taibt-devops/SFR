// Lịch sử hoạt động THEO NGÀY cho biểu đồ tiến độ trang chủ: { [dayStartTs]: { rev, nw, spk } }
// rev = lượt ôn thẻ, nw = từ MỚI học lần đầu, spk = giây đã nói (mic). Thuần trừ localStorage I/O;
// nhận `now` từ ngoài để test tất định. KHÔNG đụng SM-2 / SR state (chỉ là thống kê hiển thị).
export const DAILY_KEY = "phrasal-daily-v1";
const KEEP_DAYS = 90; // đủ cho biểu đồ 14–30 ngày, không phình localStorage

// Mốc 00:00 (giờ địa phương) → gom "cùng ngày" (giống stats.js).
export function dayStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Cắt các ngày quá cũ. Trả object mới, KHÔNG mutate.
function prune(map, now) {
  const min = dayStart(now) - KEEP_DAYS * 86400000;
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    if (Number(k) >= min) out[k] = v;
  }
  return out;
}

function bump(map, field, amount, now) {
  const m = prune(map, now);
  const k = String(dayStart(now));
  const cur = m[k] || { rev: 0, nw: 0, spk: 0 };
  return { ...m, [k]: { ...cur, [field]: (cur[field] || 0) + amount } };
}

// Gọi mỗi lần đánh giá 1 thẻ (isNew = thẻ chưa từng có SR state → "từ mới hôm nay").
export function bumpReview(map, isNew, now) {
  const m = bump(map, "rev", 1, now);
  return isNew ? bump(m, "nw", 1, now) : m;
}

// Gọi khi kết thúc 1 lượt ghi âm (warmup / đánh giá / hội thoại): cộng dồn giây đã nói.
export function bumpSpeak(map, seconds, now) {
  const s = Math.round(Number(seconds) || 0);
  return s > 0 ? bump(map, "spk", s, now) : prune(map, now);
}

// n ngày gần nhất (kể cả ngày trống = 0), CŨ → MỚI, cho biểu đồ. spkMin = phút (1 số lẻ).
export function lastNDays(map, n, now) {
  const today = dayStart(now);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = today - i * 86400000;
    const e = (map || {})[String(day)] || {};
    out.push({ day, rev: e.rev || 0, nw: e.nw || 0, spkMin: Math.round(((e.spk || 0) / 60) * 10) / 10 });
  }
  return out;
}

export function loadDaily() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
  } catch {
    return {};
  }
}
export function saveDaily(m) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(m));
  } catch {
    /* localStorage không khả dụng — bỏ qua */
  }
}
