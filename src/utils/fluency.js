// Số liệu nhịp nói từ transcript + thời lượng (giây). Thuần — cấp cho chấm CEFR (trục fluency).
const FILLERS = ["um", "uh", "er", "erm", "like", "you know", "actually", "basically", "kind of", "sort of"];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function speechStats(transcript, seconds) {
  const words = (String(transcript).trim().match(/\S+/g) || []).length;
  const secs = Math.max(0, Math.round(seconds || 0));
  const wpm = secs > 0 ? Math.round(words / (secs / 60)) : 0;
  const t = " " + String(transcript).toLowerCase() + " ";
  let fillers = 0;
  for (const f of FILLERS) {
    const m = t.match(new RegExp("\\b" + escapeRegExp(f) + "\\b", "g"));
    if (m) fillers += m.length;
  }
  return { words, seconds: secs, wpm, fillers };
}
