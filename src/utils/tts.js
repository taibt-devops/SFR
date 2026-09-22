// TTS dùng chung: ưu tiên Kokoro local (proxy /tts — giọng neural tự nhiên), lỗi/offline/không
// proxy → Web Speech API như cũ. Giọng + tốc độ lưu localStorage; giọng Kokoro = "kokoro:<id>".
import { authHeaders } from "../ai/auth.js";

const PROXY = import.meta.env.VITE_PROXY_URL;
const PREF_KEY = "phrasal-tts-v1";
const DEFAULT_RATE = 0.92;
const KOKORO_DEFAULT = "af_heart";
const AUDIO_CACHE = "phrasal-tts-audio-v1"; // Cache API: từ/câu lặp lại nhiều → lần 2 phát tức thời, offline được

// Giọng Kokoro cho UI chọn (id theo kokoro-fastapi).
export const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart (nữ · Mỹ)" },
  { id: "af_bella", label: "Bella (nữ · Mỹ)" },
  { id: "af_nicole", label: "Nicole (nữ · Mỹ, thì thầm)" },
  { id: "am_michael", label: "Michael (nam · Mỹ)" },
  { id: "am_fenrir", label: "Fenrir (nam · Mỹ)" },
  { id: "bf_emma", label: "Emma (nữ · Anh)" },
  { id: "bm_george", label: "George (nam · Anh)" },
];

// ── Web Speech (fallback) ──
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

// Danh sách giọng tiếng Anh của hệ thống (để người dùng chọn).
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

function webSpeak(text, { rate, voiceURI }) {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(voiceURI);
    u.lang = v?.lang || "en-US";
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = 1;
    speechSynthesis.speak(u);
  } catch {
    /* TTS không hỗ trợ */
  }
}

// ── Kokoro (qua proxy) ──
// Một <audio> dùng chung + "mở khóa" ở cú chạm đầu tiên: iOS chỉ cho play() bắt nguồn từ
// user gesture — element đã được kích hoạt một lần thì các play() sau (sau await fetch,
// hay khi Claude trả lời) không bị chặn nữa.
let player = null;
let curUrl = null;
function getPlayer() {
  if (!player) player = new Audio();
  return player;
}
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    () => {
      try {
        const p = getPlayer();
        p.src = SILENCE;
        p.play().catch(() => {});
      } catch {
        /* bỏ qua */
      }
    },
    { once: true }
  );
}

// Mồi <audio> bằng một cú play() im lặng TRONG cú chạm của người dùng.
// Cần cho câu MỞ LỜI: nó phát sau khi await Claude xong, lúc đó đã rời khỏi cú chạm nên trình duyệt
// có quyền chặn. Mồi trước thì element coi như "đã được người dùng cho phép".
export function primeAudio() {
  try {
    const p = getPlayer();
    p.src = SILENCE;
    return p.play().catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

async function fetchKokoro(text, voice, speed) {
  const key = "https://tts.local/" + encodeURIComponent(voice) + "/" + speed + "/" + encodeURIComponent(text);
  let cache = null;
  try {
    cache = await caches.open(AUDIO_CACHE);
    const hit = await cache.match(key);
    if (hit) return await hit.blob();
  } catch {
    cache = null; // Cache API không khả dụng (context không secure) — vẫn phát, chỉ không cache
  }
  const r = await fetch(PROXY.replace(/\/$/, "") + "/tts", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text, voice, speed }),
  });
  if (!r.ok || !(r.headers.get("content-type") || "").includes("audio")) throw new Error("tts " + r.status);
  const blob = await r.blob();
  try {
    if (cache) await cache.put(key, new Response(blob, { headers: { "content-type": "audio/mpeg" } }));
  } catch {
    /* cache đầy — bỏ qua */
  }
  return blob;
}

// Dừng mọi thứ đang đọc (audio Kokoro + speechSynthesis).
export function stop() {
  try {
    speechSynthesis.cancel();
  } catch {
    /* bỏ qua */
  }
  try {
    const p = getPlayer();
    p.pause();
  } catch {
    /* bỏ qua */
  }
  if (curUrl) {
    URL.revokeObjectURL(curUrl);
    curUrl = null;
  }
}

// Đọc to. opts.rate / opts.voiceURI ghi đè tạm; mặc định lấy từ prefs đã lưu.
// voiceURI: "" = tự động (Kokoro nếu có proxy), "kokoro:<id>" = giọng Kokoro, khác = giọng hệ thống.
export async function speak(text, opts = {}) {
  const t = String(text || "").trim();
  if (!t) return;
  stop();
  const prefs = getPrefs();
  const rate = opts.rate ?? prefs.rate ?? DEFAULT_RATE;
  const voiceURI = opts.voiceURI ?? prefs.voiceURI ?? "";
  const useKokoro = PROXY && (voiceURI === "" || voiceURI.startsWith("kokoro:"));
  if (useKokoro) {
    try {
      const blob = await fetchKokoro(t, voiceURI.startsWith("kokoro:") ? voiceURI.slice(7) : KOKORO_DEFAULT, rate);
      const p = getPlayer();
      curUrl = URL.createObjectURL(blob);
      p.src = curUrl;
      await p.play();
      return;
    } catch {
      /* proxy tắt / mạng lỗi / autoplay bị chặn → rơi về Web Speech */
    }
  }
  webSpeak(t, { rate, voiceURI });
}
