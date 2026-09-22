// Toàn bộ logic của "cuộc gọi với gia sư" — tách khỏi giao diện (CLAUDE.md: không nhét business
// logic vào component, và file quá ~300 dòng phải tách).
//
// Trước đây 13 tính năng này nằm chung một file 466 dòng với cả phần render:
// 1 hội thoại đa lượt · 2 sinh/đổi tình huống đóng vai · 3 checklist mẫu câu đã dùng ·
// 4 đọc theo (shadow) · 5 tra nghĩa từ/câu · 6 thêm từ vựng · 7 tổng kết cuối buổi ·
// 8 ghi chú gia sư liên buổi · 9 lái theo điểm yếu · 10 nói lại lượt vừa rồi ·
// 11 cộng phút nói vào biểu đồ · 12 chọn giọng/tốc độ · 13 buổi mới.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reply } from "../ai/chat.js";
import { summarize } from "../ai/summary.js";
import { translateWord } from "../ai/translate.js";
import { transcribe } from "../ai/whisper.js";
import { genScenario } from "../ai/scenario.js";
import { pickScenario } from "../data/scenarios.js";
import { matchSpoken, diffWords } from "../utils/voiceMatch.js";
import { speak, primeAudio } from "../utils/tts.js";
import { loadSpeaking, speakingProfile } from "../srs/speaking.js";
import { loadCoachNotes, saveCoachNotes, addCoachNote, priorFocusText } from "../srs/coachMemory.js";
import { loadDaily, saveDaily, bumpSpeak } from "../srs/daily.js";

const DIM_VI = { fluency: "trôi chảy", lexical: "vốn từ", grammar: "ngữ pháp", pronunciation: "phát âm" };

// Điểm cần tập trung, lấy từ hồ sơ nói → gia sư lái hội thoại trúng chỗ yếu.
function buildFocus() {
  const p = speakingProfile(loadSpeaking());
  if (!p) return "";
  const parts = [];
  if (p.weakestDim) parts.push(DIM_VI[p.weakestDim] + " (trục yếu)");
  if (p.topTags?.length) parts.push("lỗi hay lặp: " + p.topTags.slice(0, 2).map((t) => t.tag).join(", "));
  return parts.join(" · ");
}

export function useCall({ dueWords = [], level = "A2", topic = "", roleplay = false, onAddWord, focusHint = "" }) {
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | recording | thinking | error
  const [error, setError] = useState("");
  const [spoken, setSpoken] = useState(() => new Set());
  const [shadow, setShadow] = useState(null); // { target, heard, result:[{word,ok}] }
  const [summary, setSummary] = useState(null);
  const [lookup, setLookup] = useState(null); // { term, ctx, vi, loading, err }
  const [saving, setSaving] = useState(null); // { word, m, en, mLoading }
  const [scn, setScn] = useState(() => (roleplay && !topic ? pickScenario() : null));
  const [scnLoading, setScnLoading] = useState(false);

  // Điểm yếu từ hồ sơ gia sư (§10.6c) ưu tiên hơn hồ sơ CEFR — nó tươi hơn, cập nhật hằng ngày.
  const profileFocus = useMemo(buildFocus, []);
  const focus = focusHint || profileFocus;
  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const modeRef = useRef({ type: "turn" });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => { stopTracks(); try { speechSynthesis.cancel(); } catch { /* ignore */ } }, [stopTracks]);

  // ── Tình huống đóng vai ──
  const genScn = useCallback(() => {
    setScnLoading(true);
    setError("");
    genScenario(topic, level)
      .then(setScn)
      .catch((e) => setError("Không tạo được tình huống: " + String(e.message || e)))
      .finally(() => setScnLoading(false));
  }, [topic, level]);
  useEffect(() => { if (roleplay && topic) genScn(); }, [roleplay, topic, genScn]);
  const swapScn = useCallback(() => (topic ? genScn() : setScn(pickScenario(scn?.id))), [topic, genScn, scn]);

  const started = history.some((m) => m.role === "user");
  const busy = phase === "thinking";
  const shadowing = phase === "recording" && modeRef.current.type === "shadow";

  // ── Ghi âm (mic phải mở TRONG cú chạm — iOS) ──
  const processTurn = useCallback(async (blob) => {
    setPhase("thinking");
    try {
      const said = await transcribe(blob);
      if (!said) { setError("Không nghe rõ — thử nói lại."); setPhase("error"); return; }
      const hit = matchSpoken(said, dueWords);
      if (hit.length) setSpoken((s) => new Set([...s, ...hit]));
      const next = [...history, { role: "user", content: said }];
      setHistory(next);
      const answer = await reply(next, dueWords, { level, focus, topic, scenario: scn });
      setHistory([...next, { role: "assistant", content: answer }]);
      speak(answer);
      setPhase("idle");
    } catch (e) {
      setError(String(e.message || e));
      setPhase("error");
    }
  }, [dueWords, history, level, focus, topic, scn]);

  const processShadow = useCallback(async (blob, target) => {
    setPhase("thinking");
    try {
      const heard = await transcribe(blob);
      setShadow({ target, heard, result: diffWords(target, heard) });
      setPhase("idle");
    } catch (e) {
      setError(String(e.message || e));
      setPhase("error");
    }
  }, []);

  const startRecording = useCallback(async (mode) => {
    setError("");
    modeRef.current = mode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      const startedAt = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stopTracks();
        saveDaily(bumpSpeak(loadDaily(), (Date.now() - startedAt) / 1000, Date.now()));
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (modeRef.current.type === "shadow") processShadow(blob, modeRef.current.target);
        else processTurn(blob);
      };
      recRef.current = rec;
      rec.start();
      setPhase("recording");
    } catch (e) {
      setError("Không mở được mic: " + String(e.message || e));
      setPhase("error");
    }
  }, [processShadow, processTurn, stopTracks]);

  const stopRecording = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  // ── Mở lời (gia sư nói trước) ──
  const begin = useCallback(() => {
    // Mồi audio TRONG cú chạm: câu mở lời phát sau khi await Claude xong, lúc đó đã rời khỏi cú
    // chạm nên trình duyệt có quyền chặn im lặng. Đây là lý do câu đầu có thể không đọc mà câu
    // sau lại đọc (lượt sau phát ngay sau khi vừa bấm mic).
    primeAudio();
    setPhase("thinking");
    setError("");
    const recall = [focus, priorFocusText(loadCoachNotes())].filter(Boolean).join(" · ");
    reply([], dueWords, { level, focus, topic, opener: true, recall, scenario: scn })
      .then((t) => { setHistory([{ role: "assistant", content: t }]); speak(t); setPhase("idle"); })
      .catch((e) => { setError("Không lấy được câu mở đầu: " + String(e.message || e)); setPhase("error"); });
  }, [dueWords, level, focus, topic, scn]);

  // Bỏ lượt vừa rồi (câu đáp + lời mình nói) để thu lại — khi Whisper nghe nhầm.
  const redoLast = useCallback(() => {
    setHistory((h) => {
      const out = [...h];
      if (out.at(-1)?.role === "assistant") out.pop();
      if (out.at(-1)?.role === "user") out.pop();
      return out;
    });
    setError("");
  }, []);

  const endSession = useCallback(() => {
    setPhase("thinking");
    setError("");
    const label = scn ? scn.title : topic;
    summarize({ history, level, topic: label, scenario: scn })
      .then((s) => {
        setSummary(s);
        // Trí nhớ liên buổi: mở đầu buổi sau nhắc lại + "bài tập buổi sau" ở trang chủ.
        saveCoachNotes(addCoachNote(loadCoachNotes(), { at: Date.now(), topic: label, level, ...s }));
        setPhase("idle");
      })
      .catch((e) => { setError("Không tổng kết được: " + String(e.message || e)); setPhase("error"); });
  }, [history, level, topic, scn]);

  const newSession = useCallback(() => {
    setHistory([]);
    setSpoken(new Set());
    setShadow(null);
    setSummary(null);
    setError("");
    if (roleplay) swapScn();
    setPhase("idle");
  }, [roleplay, swapScn]);

  // ── Tra nghĩa ──
  const lookupTerm = useCallback((raw, context) => {
    const term = String(raw).replace(/[^A-Za-z'\- ]/g, "").trim();
    if (!term) return;
    const ctx = context || term;
    setLookup({ term, ctx, loading: true });
    translateWord(term, ctx)
      .then((vi) => setLookup({ term, ctx, vi }))
      .catch((e) => setLookup({ term, ctx, vi: "(lỗi: " + String(e.message || e) + ")", err: true }));
  }, []);

  // ── Thêm từ vựng → từ vựng của NGÀY đang học (spec §2.5) ──
  const openSave = useCallback((seed = {}) => setSaving({ word: "", m: "", en: "", ...seed }), []);

  const autoMeaning = useCallback(() => {
    const w = saving?.word?.trim();
    if (!w) return;
    setSaving((s) => ({ ...s, mLoading: true }));
    translateWord(w, saving.en || w)
      .then((vi) => setSaving((s) => (s ? { ...s, m: vi, mLoading: false } : s)))
      .catch(() => setSaving((s) => (s ? { ...s, mLoading: false } : s)));
  }, [saving]);

  const saveWord = useCallback(() => {
    const w = saving?.word?.trim();
    if (!w) return;
    onAddWord?.({ w, m: saving.m || "", en: saving.en || "" });
    setSaving(null);
  }, [saving, onAddWord]);

  return {
    history, phase, error, spoken, shadow, summary, lookup, saving,
    scn, scnLoading, focus, started, busy, shadowing,
    begin, startRecording, stopRecording, redoLast, endSession, newSession,
    swapScn, lookupTerm, setLookup, openSave, setSaving, autoMeaning, saveWord,
    setError,
  };
}
