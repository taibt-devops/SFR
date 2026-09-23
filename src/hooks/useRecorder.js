// Ghi âm → Whisper → transcript. Gom một chỗ vì cả nhịp 0, 4, 3 đều cần (trước đây mỗi màn tự chép
// lại đoạn MediaRecorder này). Không có đường gõ chữ thay thế — đó là chủ ý (C10).
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribe } from "../ai/whisper.js";
import { loadDaily, saveDaily, bumpSpeak } from "../srs/daily.js";

const MAX_SECONDS = 30; // câu drill ngắn; tự dừng để không ghi âm vô tận nếu quên bấm

// `lang`: ngôn ngữ đưa cho Whisper. Mặc định "en" nên mọi nhịp luyện nói không đổi gì.
// `countSpeak`: có cộng vào "phút nói mỗi ngày" không. Ô hỏi đáp truyền false — nói TIẾNG VIỆT
// để tra một câu KHÔNG phải luyện nói tiếng Anh. Cộng vào đó là tự thổi phồng đúng cái số liệu
// đáng lẽ phải trung thực nhất.
export function useRecorder(onResult, { lang = "en", countSpeak = true } = {}) {
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [error, setError] = useState("");
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

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  // Phải được gọi TRONG cú chạm của người dùng (iOS mới cho mở mic).
  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        cleanup();
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
        // phút nói/ngày cho biểu đồ 14 ngày — chỉ tính khi thật sự đang luyện nói tiếng Anh
        if (countSpeak) saveDaily(bumpSpeak(loadDaily(), seconds, Date.now()));
        setPhase("thinking");
        try {
          const text = await transcribe(
            new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }),
            { lang }
          );
          setPhase("idle");
          onResult?.(text, seconds);
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
  }, [cleanup, onResult, stop, lang, countSpeak]);

  const reset = useCallback(() => {
    setError("");
    setPhase("idle");
  }, []);

  return { phase, error, start, stop, reset, recording: phase === "recording" };
}
