// Điều hướng của bản "1% mỗi ngày": màn chờ → phiên học một mạch → đóng ngày.
// KHÔNG có menu chọn chủ đề/trình độ/chế độ (C9) — chương trình quyết sẵn bài của hôm nay.
// Các màn nói cũ (đóng vai / chấm CEFR / trò chuyện) không bị bỏ: chúng thành những NHỊP có lịch.
import { useMemo, useState } from "react";
import { isAuthed } from "./ai/auth.js";
import Login from "./components/Login.jsx";
import { useLesson } from "./hooks/useLesson.js";
import { completedCount, learnedPatterns } from "./srs/course.js";
import { latestLevel, loadSpeaking } from "./srs/speaking.js";
import { drillsFor, focusFor, topErrors } from "./srs/tutor.js";

import Today from "./components/Today.jsx";
import StepReview from "./components/StepReview.jsx";
import StepListen from "./components/StepListen.jsx";
import StepPattern from "./components/StepPattern.jsx";
import StepSpeak from "./components/StepSpeak.jsx";
import StepWords from "./components/StepWords.jsx";
import DayDone from "./components/DayDone.jsx";
import Progress from "./components/Progress.jsx";
import Call from "./components/Call.jsx";
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
  const [view, setView] = useState("today"); // today | progress | warmup | roleplay | chat
  const home = () => setView("today");

  const lesson = L.lesson;

  // Nói tự do: gia sư nhắc bạn dùng lại những MẪU CÂU đã học (không phải từ vựng rời) — 6 mẫu gần nhất.
  const learnedKeys = useMemo(
    () => L.lessons.filter((l) => l.patKey && L.progress[l.day]?.core).slice(-6).map((l) => l.patKey),
    [L.lessons, L.progress]
  );
  // Tình huống đóng vai: lấy của bài vừa học xong, chưa học bài nào thì lấy bài sắp học.
  const freeScene = (L.lastDone && !L.lastDone.review && L.lastDone.scene) || L.pending?.scene || "";

  // Nhiên liệu cho các màn nói cũ: ngày thường dùng từ của bài, ngày chốt tuần dùng mẫu câu cả tuần.
  const dueWords = useMemo(() => {
    if (!lesson) return [];
    if (!lesson.review) return (lesson.words || []).map((w) => w.w);
    return L.lessons.filter((l) => l.week === lesson.week && l.patKey).map((l) => l.patKey);
  }, [lesson, L.lessons]);

  // 2 câu sửa lỗi của hôm qua THAY CHỖ 2 câu cuối, không cộng thêm — nhịp 4 vẫn 5 câu, giữ
  // nguyên ngân sách 15–18 phút (§3.1, §10.6a). Đặt CÙNG các useMemo khác ở đầu hàm (không phải
  // ngay trước switch như bản nháp kế hoạch) — dưới đó có 4 lượt `return` sớm (progress/warmup/
  // roleplay/chat/done), đặt hook sau chúng làm số hook gọi mỗi lần render khác nhau, React sẽ ném
  // lỗi "Rendered fewer hooks than expected" ngay khi đóng ngày (bug thật, đã tự sửa vị trí).
  const fixDrills = useMemo(
    () => (lesson ? drillsFor(L.tutor, lesson.day) : []),
    [L.tutor, lesson]
  );
  const speakDrills = useMemo(() => {
    const own = lesson?.drills || [];
    if (!fixDrills.length) return own;
    return [...fixDrills, ...own.slice(0, Math.max(0, own.length - fixDrills.length))];
  }, [fixDrills, lesson]);

  // Gia sư ép đúng chỗ đang yếu: điểm chú ý mới nhất + 2 lỗi dai dẳng nhất (§10.6c). ĐẶT CÙNG các
  // useMemo khác ở đầu hàm, TRƯỚC mọi `return` sớm bên dưới — xem lý do ở comment của fixDrills.
  const focusHint = useMemo(() => {
    const f = focusFor(L.tutor);
    const tags = topErrors(L.tutor, loadSpeaking(), 2).map((e) => e.tag).join(", ");
    return [f, tags && "lỗi hay lặp: " + tags].filter(Boolean).join(" · ");
  }, [L.tutor]);

  if (view === "progress") {
    return <Progress lessons={L.lessons} progress={L.progress} streak={L.streak} onBack={home} />;
  }
  if (view === "warmup") return <WarmupTalk onBack={home} />;

  // ── Nói tự do (vào thẳng từ màn chờ, không cần học xong) ──
  if (view === "roleplay" || view === "chat") {
    return (
      <Call
        dueWords={learnedKeys}
        level={latestLevel(loadSpeaking()) || "A2"}
        topic={view === "roleplay" ? freeScene : TRACK_VI[L.pending?.track || "daily"]}
        roleplay={view === "roleplay"}
        onAddWord={L.addWord}
        focusHint={focusHint}
        onBack={home}
      />
    );
  }

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
        return (
          <StepReview
            bar={L.bar}
            queue={L.reviewQueue}
            getState={L.getState}
            onRate={L.rate}
            onDone={done}
            onAttempt={L.attempt}
            hintOf={L.hintOf}
            onUseHint={L.consumeHint}
          />
        );
      case "listen":
        return <StepListen {...shared} onDone={done} />;
      case "pattern":
        return <StepPattern {...shared} onDone={done} />;
      case "speak":
        return (
          <StepSpeak
            {...shared}
            drills={speakDrills}
            fixCount={fixDrills.length}
            kicker="Nói ra"
            onDone={done}
            onSaid={L.said}
            onAttempt={L.attempt}
          />
        );
      case "words":
        return <StepWords {...shared} onDone={done} onAttempt={L.attempt} />;
      case "speak2":
        return (
          <StepSpeak
            {...shared}
            drills={lesson.drills2 || []}
            kicker="Câu khó hơn"
            onDone={done}
            onSaid={L.said}
            onAttempt={L.attempt}
          />
        );

      // Nhịp 5 — đóng vai theo tình huống của bài (màn cũ, giữ nguyên logic).
      case "roleplay":
        return (
          <Call
            dueWords={dueWords}
            level={latestLevel(loadSpeaking()) || "A2"}
            // `topic` chính là mô tả tình huống: VoiceChat truyền nó cho genScenario để dựng vai.
            topic={lesson.scene}
            roleplay
            onAddWord={L.addWord}
            focusHint={focusHint}
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
          <Call
            dueWords={dueWords}
            level={latestLevel(loadSpeaking()) || "A2"}
            topic={TRACK_VI[lesson.track]}
            onAddWord={L.addWord}
            focusHint={focusHint}
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
      days={L.days}
      last={learnedPatterns(L.lessons, L.progress)[0] || null}
      onStart={L.start}
      onProgress={() => setView("progress")}
      onWarmup={() => setView("warmup")}
      onRoleplay={() => setView("roleplay")}
      onChat={() => setView("chat")}
    />
  );
}
