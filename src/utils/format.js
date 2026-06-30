import { DAY } from "../srs/sm2.js";

// Định dạng thời điểm đến hạn (ms) thành chuỗi thân thiện cho dashboard / màn hoàn thành.
export function dueLabel(ms, now = Date.now()) {
  if (ms == null) return "—";
  const days = Math.ceil((ms - now) / DAY);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  return `${days} ngày nữa`;
}
