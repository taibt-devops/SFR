import { useMemo, useState } from "react";
import { buildSession } from "./srs/sm2.js";
import { useStudy } from "./hooks/useStudy.js";
import { useVocab } from "./hooks/useVocab.js";
import { dueLabel } from "./utils/format.js";
import Dashboard from "./components/Dashboard.jsx";
import StudySession from "./components/StudySession.jsx";
import DataManager from "./components/DataManager.jsx";
import MiniStory from "./components/MiniStory.jsx";
import VoiceChat from "./components/VoiceChat.jsx";

export default function App() {
  const vocabApi = useVocab();
  const study = useStudy(vocabApi.vocab);
  const [view, setView] = useState("home"); // "home" | "data" | "story"
  const [productionMode, setProductionMode] = useState(false); // §5.2 — đặt câu trước khi lật

  // Vài từ due để cấp ngữ cảnh cho mini-story (ưu tiên thẻ đến hạn, sau đó thẻ mới).
  const dueWords = useMemo(
    () => buildSession(vocabApi.vocab, study.getState, { newLimit: 4, maxReviews: 4 }).slice(0, 8).map((c) => c.v),
    [vocabApi.vocab, study.getState]
  );

  // ── Đang ôn ──
  if (study.started && !study.done) {
    return (
      <StudySession
        card={study.card}
        state={study.state}
        progress={study.progress}
        productionMode={productionMode}
        onRate={study.rate}
        onExit={study.exit}
      />
    );
  }

  // ── Hoàn thành phiên ──
  if (study.done) {
    const { total, good, again } = study.summary;
    return (
      <div className="app">
        <div className="done-check">✓</div>
        <div className="done-title">Hoàn thành phiên!</div>
        <div className="done-sub">Bạn đã ôn {total} thẻ</div>
        <div className="done-stats">
          <div className="ds"><div className="ds-num" style={{ color: "var(--green)" }}>{good}</div><div className="ds-lab">Nhớ tốt</div></div>
          <div className="ds"><div className="ds-num" style={{ color: "var(--amber)" }}>{again}</div><div className="ds-lab">Cần ôn lại</div></div>
        </div>
        <div className="next-due">
          <span className="nd-lab">Thẻ đến hạn kế tiếp</span>
          <span className="nd-val">{dueLabel(study.nextDue)}</span>
        </div>
        <div className="spacer" />
        <button className="cta" onClick={study.exit}><span className="cta-main">Về màn hình chính</span></button>
      </div>
    );
  }

  // ── Quản lý dữ liệu ──
  if (view === "data") {
    return (
      <DataManager
        userWords={vocabApi.userWords}
        importText={vocabApi.importText}
        removeWord={vocabApi.removeWord}
        exportText={vocabApi.exportText}
        onBack={() => setView("home")}
      />
    );
  }

  // ── Mini-story ──
  if (view === "story") {
    return <MiniStory dueWords={dueWords} onBack={() => setView("home")} />;
  }

  // ── Luyện nói ──
  if (view === "voice") {
    return <VoiceChat dueWords={dueWords} addWord={vocabApi.addWord} onBack={() => setView("home")} />;
  }

  // ── Màn hình chính (Dashboard) ──
  return (
    <Dashboard
      cards={vocabApi.vocab}
      getState={study.getState}
      onStart={study.start}
      onManage={() => setView("data")}
      onReset={study.resetProgress}
      productionMode={productionMode}
      onToggleProduction={() => setProductionMode((v) => !v)}
      stats={study.stats}
      onStory={() => setView("story")}
      onVoice={() => setView("voice")}
    />
  );
}
