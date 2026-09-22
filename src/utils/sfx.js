// Âm phản hồi TỰ SINH bằng Web Audio — không file mp3, không tải gì từ đâu (C8, và PWA phải
// chạy offline). Mỗi âm chỉ vài chục mili-giây, sóng sine/triangle, gain thấp.
//
// Nguyên tắc: âm thanh ở đây để XÁC NHẬN hành động, không phải để vui tai. Học 15 phút mỗi ngày
// mà app kêu như máy chơi game thì vài hôm là tắt tiếng. Nên: ngắn, trầm, không lặp.
//
// AudioContext chỉ được tạo TRONG cú chạm của người dùng (trình duyệt chặn autoplay), mà mọi âm
// ở đây đều phát sau một cú bấm nên tạo lười là đủ.

const KEY = "srf-sfx-v1";
let ctx = null;

export function isMuted() {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}

export function setMuted(v) {
  try {
    localStorage.setItem(KEY, v ? "off" : "on");
  } catch {
    /* localStorage không khả dụng — phiên này cứ kêu */
  }
}

function audio() {
  if (isMuted()) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null; // trình duyệt không có Web Audio → im lặng, không ném lỗi
  }
}

// Một nốt: tần số, thời lượng, độ trễ. Envelope dốc để nghe "gọn", không ù.
function note(freq, { dur = 0.12, delay = 0, gain = 0.06, type = "sine" } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Chuyển nhịp / chọn — một blip rất nhẹ.
export function tick() {
  note(880, { dur: 0.05, gain: 0.03, type: "triangle" });
}

// Nói khớp — hai nốt đi lên (quãng năm), dứt khoát.
export function good() {
  note(587.33, { dur: 0.1, gain: 0.05 });
  note(880, { dur: 0.16, delay: 0.075, gain: 0.05 });
}

// Nói lệch — một nốt trầm, KHÔNG phải tiếng "sai" chói tai. Sai là chuyện bình thường khi học nói.
export function miss() {
  note(233.08, { dur: 0.18, gain: 0.045, type: "triangle" });
}

// Đóng ngày — hợp âm rải đi lên, phần thưởng duy nhất trong ngày nên được phép dài hơn chút.
export function done() {
  const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  chord.forEach((f, i) => note(f, { dur: 0.5, delay: i * 0.085, gain: 0.05 }));
}
