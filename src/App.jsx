// Điều hướng của bản "1% mỗi ngày": màn chờ → phiên học một mạch → đóng ngày.
// KHÔNG có menu chọn chủ đề/trình độ/chế độ (C9) — chương trình quyết sẵn bài của hôm nay.
// Các màn nói cũ (đóng vai / chấm CEFR / trò chuyện) không bị bỏ: chúng thành những NHỊP có lịch.
import { useMemo, useState } from "react";
import { isAuthed } from "./ai/auth.js";
import Login from "./components/Login.jsx";
import { useLesson } from "./hooks/useLesson.js";
import { completedCount } from "./srs/course.js";
import { latestLevel, loadSpeaking } from "./srs/speaking.js";

import Today from "./components/Today.jsx";
import StepReview from "./components/StepReview.jsx";
import StepListen from "./components/StepListen.jsx";
import StepPattern from "./components/StepPattern.jsx";
import StepSpeak from "./components/StepSpeak.jsx";
import StepWords from "./components/StepWords.jsx";
import DayDone from "./components/DayDone.jsx";
import Progress from "./components/Progress.jsx";
import VoiceChat from "./components/VoiceChat.jsx";
import SpeakingAssess from "./components/SpeakingAssess.jsx";
import WarmupTalk from "./components/WarmupTalk.jsx";

const TRACK_VI = { daily: "Đời thường & du lịch", work: "Công việc & phỏng vấn" };

export default function App() {
  const [authed, setAuthed] = useState(isAuthed);
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <AppMain />;
}

function AppMain() {
  const L = useLesson();
  const [view, setView] = useState("today"); // today | progress | warmup
  const home = () => setView("today");

  const lesson = L.lesson;

  // Nhiên liệu cho các màn nói cũ: ngày thường dùng từ của bài, ngày chốt tuần dùng mẫu câu cả tuần.
  const dueWords = useMemo(() => {
    if (!lesson) return [];
    if (!lesson.review) return (lesson.words || []).map((w) => w.w);
    return L.lessons.filter((l) => l.week === lesson.week && l.patKey).map((l) => l.patKey);
  }, [lesson, L.lessons]);

  if (view === "progress") {
    return <Progress lessons={L.lessons} progress={L.progress} streak={L.streak} onBack={home} />;
  }
  if (view === "warmup") return <WarmupTalk onBack={home} />;

  // ── Đóng ngày ──
  if (L.mode === "done") {
    return (
      <DayDone
        lesson={lesson}
        streak={L.streak}
        saidBest={L.saidBest}
        extDone={!!L.progress[lesson?.day]?.ext}
        canExt={!!lesson && !lesson.review}
        onExt={L.startExt}
        onExit={L.exit}
      />
    );
  }

  // ── Đang trong phiên ──
  if (lesson && L.step) {
    const shared = { lesson, bar: L.bar };
    const done = () => L.complete(L.step);

    switch (L.step) {
      case "review":
        return <StepReview bar={L.bar} queue={L.reviewQueue} getState={L.getState} onRate={L.rate} onDone={done} />;
      case "listen":
        return <StepListen {...shared} onDone={done} />;
      case "pattern":
        return <StepPattern {...shared} onDone={done} />;
      case "speak":
        return <StepSpeak {...shared} drills={lesson.drills} kicker="Nói ra" onDone={done} onSaid={L.said} />;
      case "words":
        return <StepWords {...shared} onDone={done} />;
      case "speak2":
        return <StepSpeak {...shared} drills={lesson.drills2 || []} kicker="Câu khó hơn" onDone={done} onSaid={L.said} />;

      // Nhịp 5 — đóng vai theo tình huống của bài (màn cũ, giữ nguyên logic).
      case "roleplay":
        return (
          <VoiceChat
            dueWords={dueWords}
            level={latestLevel(loadSpeaking()) || "A2"}
            // `topic` chính là mô tả tình huống: VoiceChat truyền nó cho genScenario để dựng vai.
            topic={lesson.scene}
            roleplay
            onBack={done}
          />
        );

      // ── Ngày chốt tuần (spec §3.4) ──
      case "assess":
        return (
          <SpeakingAssess
            dueWords={dueWords}
            topic={TRACK_VI[lesson.track]}
            topicId={`week-${lesson.week}`}
            scopeLabel={`Chốt tuần ${lesson.week}`}
            onBack={done}
          />
        );
      case "chat":
        return (
          <VoiceChat
            dueWords={dueWords}
            level={latestLevel(loadSpeaking()) || "A2"}
            topic={TRACK_VI[lesson.track]}
            onBack={done}
          />
        );
      default:
        break;
    }
  }

  // ── Màn chờ ──
  return (
    <Today
      lesson={L.pending}
      streak={L.streak}
      doneToday={L.doneToday}
      completed={completedCount(L.progress)}
      onStart={L.start}
      onProgress={() => setView("progress")}
      onWarmup={() => setView("warmup")}
    />
  );
}
