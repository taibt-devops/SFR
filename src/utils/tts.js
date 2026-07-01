// TTS dùng chung (Web Speech API — built-in, không lib). Tự chọn giọng tự nhiên nhất,
// tốc độ chậm vừa để nhấn nhá rõ; cho phép ghi đè giọng/tốc độ (lưu localStorage).
const PREF_KEY = "phrasal-tts-v1";
const DEFAULT_RATE = 0.92;

let cached = [];
function loadVoices() {
  try {
    cached = window.speechSynthesis?.getVoices?.() || [];
  } catch {
    cached = [];
  }
  return cached;
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  try {
    window.speechSynthesis.onvoiceschanged = loadVoices; // voices nạp bất đồng bộ
  } catch {
    /* bỏ qua */
  }
}

// Danh sách giọng tiếng Anh (để người dùng chọn).
export function englishVoices() {
  return (cached.length ? cached : loadVoices()).filter((v) => /^en([-_]|$)/i.test(v.lang));
}

// Điểm ưu tiên: neural/online/natural > Google > giọng có tên người > en-US; trừ điểm giọng rè.
function score(v) {
  const n = (v.name + " " + v.lang).toLowerCase();
  let s = 0;
  if (/natural|neural|online|enhanced|premium/.test(n)) s += 100;
  if (/google/.test(n)) s += 60;
  if (/\b(aria|jenny|guy|libby|sonia|ryan|emma|ava|samantha|siri|nathan|serena)\b/.test(n)) s += 40;
  if (/en[-_]us/.test(n)) s += 10;
  else if (/en[-_]gb/.test(n)) s += 6;
  if (/desktop|espeak|compact|pico/.test(n)) s -= 50; // giọng robot/rè
  return s;
}

export function getPrefs() {
  try {
    return { rate: DEFAULT_RATE, voiceURI: "", ...(JSON.parse(localStorage.getItem(PREF_KEY)) || {}) };
  } catch {
    return { rate: DEFAULT_RATE, voiceURI: "" };
  }
}
export function setPrefs(p) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...getPrefs(), ...p }));
  } catch {
    /* localStorage không khả dụng */
  }
}

function pickVoice(voiceURI) {
  const evs = englishVoices();
  if (voiceURI) {
    const hit = evs.find((v) => v.voiceURI === voiceURI);
    if (hit) return hit;
  }
  return evs.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

// Đọc to. opts.rate / opts.voiceURI ghi đè tạm; mặc định lấy từ prefs đã lưu.
export function speak(text, opts = {}) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const prefs = getPrefs();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(opts.voiceURI ?? prefs.voiceURI);
    u.lang = v?.lang || "en-US";
    if (v) u.voice = v;
    u.rate = opts.rate ?? prefs.rate ?? DEFAULT_RATE;
    u.pitch = 1;
    speechSynthesis.speak(u);
  } catch {
    /* TTS không hỗ trợ */
  }
}
