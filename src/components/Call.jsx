// Điều phối "cuộc gọi": brief → gọi → tổng kết. Mỏng, không chứa logic (nằm ở hooks/useCall.js).
// Thay cho VoiceChat.jsx cũ (466 dòng ôm cả logic lẫn 3 màn).
import { useState } from "react";
import { useCall } from "../hooks/useCall.js";
import CallBrief from "./CallBrief.jsx";
import CallScreen from "./CallScreen.jsx";
import CallSummary from "./CallSummary.jsx";
import AddWordModal from "./AddWordModal.jsx";

export default function Call({ dueWords = [], level = "A2", topic = "", roleplay = false, onAddWord, focusHint = "", onBack }) {
  // Trò chuyện tự do: người học được CHỌN nói về cái gì. Không phá C9 — C9 cấm bắt chọn trước
  // BÀI HỌC hằng ngày, còn đây là phần ngoài streak, chọn chủ đề chính là lý do nó tồn tại.
  // null = "theo bài đã học" (gia sư tự lái quanh các mẫu câu).
  const [chosen, setChosen] = useState(null);
  const c = useCall({ dueWords, level, topic: roleplay ? topic : chosen || topic, roleplay, onAddWord, focusHint });

  if (c.summary) {
    return (
      <CallSummary
        summary={c.summary}
        scn={c.scn}
        spoken={c.spoken}
        dueWords={dueWords}
        onNew={c.newSession}
        onBack={onBack}
      />
    );
  }

  // Chưa mở lời → còn ở màn brief.
  if (c.history.length === 0) {
    return (
      <CallBrief
        roleplay={roleplay}
        scn={c.scn}
        scnLoading={c.scnLoading}
        patterns={dueWords}
        chosen={chosen}
        onPickTopic={setChosen}
        busy={c.busy}
        onSwap={c.swapScn}
        onStart={c.begin}
        onBack={onBack}
      />
    );
  }

  return (
    <>
      <CallScreen
        roleplay={roleplay}
        scn={c.scn}
        history={c.history}
        phase={c.phase}
        error={c.error}
        spoken={c.spoken}
        dueWords={dueWords}
        shadow={c.shadow}
        shadowing={c.shadowing}
        busy={c.busy}
        started={c.started}
        onWord={c.lookupTerm}
        onShadow={(t) => c.startRecording({ type: "shadow", target: t })}
        onAddWord={c.openSave}
        onRec={() => c.startRecording({ type: "turn" })}
        onStop={c.stopRecording}
        onRedo={c.redoLast}
        onEnd={c.endSession}
        onBack={onBack}
      />

      {/* Tra nghĩa nhanh — nổi trên cùng, có lối tắt thêm thẳng vào từ vựng của ngày. */}
      {c.lookup && (
        <div className="lookup-pop">
          <span>
            <b style={{ color: "var(--lime)" }}>{c.lookup.term}</b>{" "}
            {c.lookup.loading ? "— đang dịch…" : "— " + c.lookup.vi}
          </span>
          {!c.lookup.loading && !c.lookup.err && (
            <button
              className="btn btn-sm"
              onClick={() => {
                c.openSave({
                  word: c.lookup.term,
                  m: c.lookup.vi,
                  en: c.lookup.ctx === c.lookup.term ? "" : c.lookup.ctx,
                });
                c.setLookup(null);
              }}
            >＋ Thêm</button>
          )}
          <button className="hud-mute" onClick={() => c.setLookup(null)}>✕</button>
        </div>
      )}

      {c.saving && (
        <AddWordModal
          value={c.saving}
          onChange={c.setSaving}
          onAuto={c.autoMeaning}
          onSave={c.saveWord}
          onClose={() => c.setSaving(null)}
        />
      )}
    </>
  );
}
