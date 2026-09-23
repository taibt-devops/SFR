// Nối lớp thuần (lesson/course/items/sm2) vào React. KHÔNG chứa business logic —
// mọi quyết định đều gọi xuống `srs/*`, hook chỉ giữ state và ghi xuống localStorage.
import { useCallback, useEffect, useMemo, useState } from "react";
import { lessons, lessonByDay } from "../data/course/index.js";
import { todayLesson, nextStep, completeStep, stepProgress, lastCompleted, isWeekClose } from "../srs/lesson.js";
import { loadCourse, saveCourse, purgeLegacy, streakFor, doneToday, recordSaid, saidFor, recentDays, weekDays, weekCount, ngayNghi, learnedWords, countLearnedWords } from "../srs/course.js";
import { itemsFor, promptFor } from "../srs/items.js";
import { loadMyWords, saveMyWords, addMyWord, countMyWords } from "../srs/myWords.js";
import { buildSession, review } from "../srs/sm2.js";
import { loadProgress, saveProgress } from "../srs/storage.js";
import { loadDaily, saveDaily, bumpReview } from "../srs/daily.js";
import { loadTutor, saveTutor, addAttempt, setAnalysis, topErrors, attemptsFor, hintFor, clearHint } from "../srs/tutor.js";
import { analyzeSession } from "../ai/tutor.js";
import { loadSpeaking, latestLevel } from "../srs/speaking.js";

const REVIEW_LIMIT = 8; // nhịp 0 ~4 phút (spec §3.1)

export function useLesson() {
  const [progress, setProgress] = useState(() => {
    purgeLegacy(); // dọn dữ liệu bản cũ đúng một lần
    return loadCourse();
  });
  const [srs, setSrs] = useState(loadProgress);
  const [myWords, setMyWords] = useState(loadMyWords);
  const [tutor, setTutor] = useState(loadTutor);
  const [mode, setMode] = useState("idle"); // idle | core | ext | done
  const [activeDay, setActiveDay] = useState(null);

  const getState = useCallback((id) => srs[id] || null, [srs]);

  // Bài đang học: đã bắt đầu phiên thì ghim lại (xong lõi, `todayLesson` sẽ nhảy sang bài kế —
  // nhưng màn đóng ngày và phần mở rộng vẫn phải nói về bài vừa học).
  const pending = useMemo(() => todayLesson(lessons, progress), [progress]);
  const lesson = activeDay ? lessonByDay(activeDay) : pending;

  const step = useMemo(() => {
    if (!lesson || mode === "idle" || mode === "done") return null;
    return nextStep(lesson, progress, { ext: mode === "ext" });
  }, [lesson, progress, mode]);

  const bar = useMemo(
    () => (lesson ? stepProgress(lesson, progress, { ext: mode === "ext" }) : { index: 0, total: 0, steps: [] }),
    [lesson, progress, mode]
  );

  // Hàng đợi ôn của nhịp 0 — chỉ item của những bài ĐÃ học xong lõi (spec §2.3).
  const reviewQueue = useMemo(() => {
    const pool = itemsFor(lessons, progress, myWords);
    return buildSession(pool, getState, { newLimit: 0, maxReviews: REVIEW_LIMIT, now: Date.now() });
  }, [progress, getState, myWords]);

  const persist = useCallback((next) => {
    setProgress(next);
    saveCourse(next);
  }, []);

  const start = useCallback(() => {
    if (!pending) return;
    setActiveDay(pending.day);
    setMode("core");
  }, [pending]);

  const startExt = useCallback(() => {
    if (!lesson || isWeekClose(lesson)) return;
    setMode("ext");
  }, [lesson]);

  const exit = useCallback(() => {
    setMode("idle");
    setActiveDay(null);
  }, []);

  // Xong một nhịp. Nhịp cuối của phần đang chạy → chuyển sang màn đóng ngày.
  const complete = useCallback(
    (which) => {
      if (!lesson) return;
      const now = Date.now();
      const next = completeStep(progress, lesson, which, now);
      persist(next);
      if (!nextStep(lesson, next, { ext: mode === "ext" })) setMode("done");

      // Đóng ngày → phân tích nền. KHÔNG await: màn đóng ngày là khoảnh khắc trả công duy nhất
      // trong ngày (§4.1), bắt nó chờ LLM là hỏng. Hỏng thì im lặng bỏ qua (§10.8).
      // "speak" = nhịp cuối của lõi ngày thường, "chat" = nhịp cuối của lõi ngày chốt tuần — chọn
      // đúng 2 mốc này (thay vì đợi cả `mode==="ext"` xong) để phân tích LUÔN chạy mỗi ngày, kể cả
      // khi người học bỏ qua phần mở rộng tuỳ chọn (words/speak2/roleplay).
      if (which === "speak" || which === "chat") {
        const day = lesson.day;
        const attempts = attemptsFor(tutor, day);
        if (attempts.length) {
          analyzeSession({
            level: latestLevel(loadSpeaking()) || "A2",
            pattern: lesson.pat || "",
            attempts,
            recentErrors: topErrors(tutor, loadSpeaking(), 3),
          })
            .then((raw) => {
              setTutor((prev) => {
                const nx = setAnalysis(prev, day, raw, Date.now());
                saveTutor(nx);
                return nx;
              });
            })
            .catch(() => {
              /* mạng lỗi / token hết hạn / Claude chậm → buổi sau chạy như chưa có gia sư (§10.8) */
            });
        }
      }
    },
    [lesson, progress, mode, persist, tutor]
  );

  // Chấm một item ôn. `q` do NGƯỜI HỌC chọn (C5) — hook chỉ ghi lịch do sm2.js tính.
  const rate = useCallback((itemId, q) => {
    const now = Date.now();
    setSrs((prev) => {
      const isNew = !prev[itemId]?.seen;
      const next = { ...prev, [itemId]: review(prev[itemId], q, now) };
      saveProgress(next);
      saveDaily(bumpReview(loadDaily(), isNew, now)); // biểu đồ 14 ngày (module cũ, giữ nguyên)
      return next;
    });
  }, []);

  // Thêm từ vào từ vựng của NGÀY đang học. Gắn vào bài vừa xong nếu hôm nay đã học, còn không thì
  // gắn vào bài sắp học — người học coi cả hai là "hôm nay".
  const addWord = useCallback((entry) => {
    const day = (lastCompleted(lessons, progress)?.day) || pending?.day;
    if (!day) return;
    setMyWords((prev) => {
      const next = addMyWord(prev, day, entry, Date.now());
      saveMyWords(next);
      return next;
    });
  }, [progress, pending]);

  // Ghi lại một lần nói để cuối ngày gửi gia sư phân tích (spec §10.3).
  const attempt = useCallback(
    (a) => {
      if (!lesson) return;
      setTutor((prev) => {
        const next = addAttempt(prev, lesson.day, a, Date.now());
        saveTutor(next);
        return next;
      });
    },
    [lesson]
  );

  const hintOf = useCallback((itemId) => hintFor(tutor, itemId), [tutor]);

  // Gợi ý chỉ nhắc MỘT lần — dùng xong thì gỡ khỏi kho.
  const consumeHint = useCallback((itemId) => {
    setTutor((prev) => {
      const next = clearHint(prev, itemId);
      if (next !== prev) saveTutor(next);
      return next;
    });
  }, []);

  // Ghi câu người học nói đúng — bằng chứng tiến bộ trên màn đóng ngày.
  const said = useCallback(
    (text, score) => {
      if (!lesson) return;
      persist(recordSaid(progress, lesson, text, score));
    },
    [lesson, progress, persist]
  );

  return {
    lessons,
    lesson,
    pending,
    mode,
    step,
    bar,
    progress,
    reviewQueue,
    getState,
    promptFor,
    streak: streakFor(progress, Date.now()),
    doneToday: doneToday(progress, Date.now()),
    days: recentDays(progress, 14, Date.now()),
    week: weekDays(progress, Date.now()),
    weekCount: weekCount(progress, Date.now()),
    nghi: ngayNghi(progress, Date.now()),
    words: learnedWords(lessons, progress, myWords),
    wordCount: countLearnedWords(lessons, progress, myWords),
    saidBest: lesson ? saidFor(progress, lesson.day) : null,
    lastDone: lastCompleted(lessons, progress),
    myWords,
    myWordCount: countMyWords(myWords),
    addWord,
    tutor,
    attempt,
    hintOf,
    consumeHint,
    start,
    startExt,
    exit,
    complete,
    rate,
    said,
  };
}
