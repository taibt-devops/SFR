// Ghi âm → Whisper → transcript. Gom một chỗ vì cả nhịp 0, 4, 3 đều cần (trước đây mỗi màn tự chép
// lại đoạn MediaRecorder này). Không có đường gõ chữ thay thế — đó là chủ ý (C10).
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeDetail } from "../ai/whisper.js";
import { loadDaily, saveDaily, bumpSpeak } from "../srs/daily.js";

const MAX_SECONDS = 30; // câu drill ngắn; tự dừng để không ghi âm vô tận nếu quên bấm

// Cấu hình thu. Trình duyệt mặc định bật cả 3 bộ xử lý tín hiệu vì chúng được chỉnh cho CUỘC GỌI
// THOẠI, nơi mục tiêu là nghe dễ chịu chứ không phải giữ nguyên tín hiệu. Với nhận dạng giọng nói
// thì `noiseSuppression` là thứ hại nhất: nó gọt phụ âm cuối và làm méo thanh điệu — đúng hai thứ
// tiếng Việt dựa vào. `echoCancellation` cũng tắt vì không có loa nào đang phát khi ta ghi âm.
// AGC giữ lại: điện thoại cầm xa miệng thì nó kéo âm lượng lên, có lợi.
const AUDIO = {
  channelCount: 1,          // Whisper làm việc trên mono; stereo chỉ tổ nặng file
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
};
// Khai báo thẳng thay vì để mặc định: máy tính hay cho 128k nhưng điện thoại có thể tụt thấp hơn
// nhiều, và đó chính là chỗ chất lượng thu đi xuống mà không ai thấy.
const REC_OPTS = { audioBitsPerSecond: 128000 };

// `lang`: ngôn ngữ đưa cho Whisper. Mặc định "en" nên mọi nhịp luyện nói không đổi gì.
// `prompt`: câu mồi ngữ cảnh cho bộ giải mã (xem ai/whisper.js).
// `countSpeak`: có cộng vào "phút nói mỗi ngày" không. Ô hỏi đáp truyền false — nói TIẾNG VIỆT
// để tra một câu KHÔNG phải luyện nói tiếng Anh. Cộng vào đó là tự thổi phồng đúng cái số liệu
// đáng lẽ phải trung thực nhất.
export function useRecorder(onResult, { lang = "en", prompt = "", countSpeak = true } = {}) {
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [error, setError] = useState("");
  const [clip, setClip] = useState(null); // { url, seconds, kbps } — bản ghi gần nhất, để nghe lại
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);

  const cleanup = useCallback(() => {
    clearTimeout(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);
  // Thu hồi object URL khi rời màn — không thì mỗi lần ghi âm bỏ lại một blob trong bộ nhớ.
  const clipUrl = clip?.url;
  useEffect(() => () => { if (clipUrl) URL.revokeObjectURL(clipUrl); }, [clipUrl]);

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  // Phải được gọi TRONG cú chạm của người dùng (iOS mới cho mở mic).
  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
      streamRef.current = stream;
      // Máy nào không nhận REC_OPTS thì quay về mặc định, chứ đừng để hỏng cả việc ghi âm.
      let rec;
      try {
        rec = new MediaRecorder(stream, REC_OPTS);
      } catch {
        rec = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        cleanup();
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        // phút nói/ngày cho biểu đồ 14 ngày — chỉ tính khi thật sự đang luyện nói tiếng Anh
        if (countSpeak) saveDaily(bumpSpeak(loadDaily(), seconds, Date.now()));
        setPhase("thinking");
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        // Giữ bản ghi để nghe lại. Khi transcript sai, đây là thứ DUY NHẤT phân biệt được "mic thu
        // tệ" với "mic thu tốt nhưng model nghe sai" — hai nguyên nhân sửa theo hai hướng khác hẳn.
        setClip((cu) => {
          if (cu?.url) URL.revokeObjectURL(cu.url);
          return { url: URL.createObjectURL(blob), seconds, kbps: seconds ? Math.round((blob.size * 8) / (seconds * 1000)) : 0 };
        });
        try {
          // Lấy bản CHI TIẾT: cùng một lượt gọi, cùng độ trễ, nhưng kèm mốc thời gian và độ tin
          // cậy từng từ. Trước đây ta vứt hết phần đó đi.
          const chiTiet = await transcribeDetail(blob, { lang, prompt });
          setPhase("idle");
          onResult?.(chiTiet.text, seconds, chiTiet);
        } catch (e) {
          setError("Không nghe được: " + String(e.message || e));
          setPhase("error");
        }
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(stop, MAX_SECONDS * 1000);
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Không mở được mic: " + String(e.message || e));
      setPhase("error");
    }
  }, [cleanup, onResult, stop, lang, prompt, countSpeak]);

  const reset = useCallback(() => {
    setError("");
    setPhase("idle");
  }, []);

  return { phase, error, start, stop, reset, clip, recording: phase === "recording" };
}
