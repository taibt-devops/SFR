// "Đọc theo" (shadowing) dùng chung: thu mic → Whisper → diff từ với câu mục tiêu (§5.5).
// Mic mở trong cú chạm người dùng (iOS). KHÔNG đụng SM-2 — chỉ tín hiệu tham khảo phát âm.
import { useCallback, useEffect, useRef, useState } from "react";
import { transcribe } from "../ai/whisper.js";
import { diffWords } from "../utils/voiceMatch.js";

export function useShadow() {
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [result, setResult] = useState(null); // { target, heard, result:[{word,ok}] }
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const targetRef = useRef("");

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (target) => {
      setError("");
      setResult(null);
      targetRef.current = target;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const rec = new MediaRecorder(stream);
        chunksRef.current = [];
        rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
        rec.onstop = async () => {
          stopTracks();
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          setPhase("thinking");
          try {
            const heard = await transcribe(blob);
            setResult({ target: targetRef.current, heard, result: diffWords(targetRef.current, heard) });
            setPhase("idle");
          } catch (e) {
            setError(String(e.message || e));
            setPhase("error");
          }
        };
        recRef.current = rec;
        rec.start();
        setPhase("recording");
      } catch (e) {
        setError("Không mở được mic: " + String(e.message || e));
        setPhase("error");
      }
    },
    [stopTracks]
  );

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  // Dọn mic khi unmount (đổi thẻ / thoát).
  useEffect(() => () => stopTracks(), [stopTracks]);

  return { phase, result, error, start, stop };
}
