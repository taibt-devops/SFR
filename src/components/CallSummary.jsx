// Tổng kết cuối buổi nói. Giữ nguyên nội dung bản cũ (làm tốt / cần luyện / recast / gợi ý buổi
// sau / đạt mục tiêu đóng vai) — chỉ đổi lớp vỏ cho cùng tông với phần còn lại.
//
// Recast là phần đắt nhất ở đây: câu CHÍNH BẠN vừa nói được viết lại theo cách người bản xứ nói,
// nghe mẫu rồi đọc theo lại chính nó.
import { useShadow } from "../hooks/useShadow.js";
import { IcoVolume, IcoStop, IcoTarget, IcoCheck, IcoWrench, IcoBulb, IcoUp, IcoClock } from "./Icon.jsx";
import { speak } from "../utils/tts.js";

function Recast({ u }) {
  const { phase, result, error, start, stop } = useShadow();
  return (
    <div className="card">
      <p className="muted small" style={{ margin: 0 }}>Bạn nói: “{u.orig}”</p>
      <p className="answer-en" style={{ margin: "8px 0 0" }}>{u.better}</p>
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn btn-sm" onClick={() => speak(u.better)}><IcoVolume size={15} /> Nghe</button>
        {phase === "recording" ? (
          <button className="btn btn-sm btn-rec" onClick={stop}><IcoStop size={14} /> Dừng</button>
        ) : (
          <button className="btn btn-sm" disabled={phase === "thinking"} onClick={() => start(u.better)}>
            {phase === "thinking" ? "Đang nghe…" : <><IcoTarget size={15} /> Đọc theo</>}
          </button>
        )}
      </div>
      {error && <p className="small" style={{ color: "var(--red)", marginBottom: 0 }}>{error}</p>}
      {result && (
        <p className="heard" style={{ marginBottom: 0 }}>
          {result.result.map((x, i) => (
            <span key={i} className={x.ok ? "w-ok" : "w-bad"}>{x.word} </span>
          ))}
        </p>
      )}
    </div>
  );
}

function List({ icon, title, items, tone }) {
  if (!items?.length) return null;
  return (
    <>
      <div className="step-kicker inline-ic" style={{ color: tone }}>{icon}{title}</div>
      <ul className="sum-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </>
  );
}

export default function CallSummary({ summary, scn, spoken, dueWords, onNew, onBack }) {
  return (
    <div className="screen">
      <div className="hud">
        <span>TỔNG KẾT BUỔI NÓI</span>
        <button className="hud-mute" onClick={onBack}>✕</button>
      </div>

      {scn && summary.goalDone !== undefined && (
        <div className={`card ${summary.goalDone ? "card-hot" : ""}`}>
          <div className="eyebrow" style={summary.goalDone ? undefined : { color: "var(--ember)" }}>
            {summary.goalDone ? <><IcoCheck size={15} /> Đạt mục tiêu</> : <><IcoClock size={15} /> Chưa đạt mục tiêu</>}
          </div>
          <p className="t-hero-title" style={{ fontSize: 22, marginTop: 6 }}>{scn.title}</p>
          {summary.goalNote && <p className="muted small" style={{ marginBottom: 0 }}>{summary.goalNote}</p>}
        </div>
      )}

      {dueWords.length > 0 && (
        <>
          <div className="step-kicker">Mẫu câu đã dùng · {spoken.size}/{dueWords.length}</div>
          <div className="call-goals">
            {dueWords.map((w) => (
              <span key={w} className={`goal-chip ${spoken.has(w) ? "on" : ""}`}>
                {spoken.has(w) && <IcoCheck size={12} />}{w}
              </span>
            ))}
          </div>
        </>
      )}

      <List icon={<IcoCheck size={15} />} title="Làm tốt" items={summary.wentWell} tone="var(--ok)" />
      <List icon={<IcoWrench size={15} />} title="Cần luyện" items={summary.toImprove} tone="var(--ember)" />

      {summary.upgrades?.length > 0 && (
        <>
          <div className="step-kicker inline-ic"><IcoUp size={14} /> Câu của bạn, và cách nói tự nhiên hơn</div>
          {summary.upgrades.map((u, i) => <Recast key={i} u={u} />)}
        </>
      )}

      {summary.suggestion && (
        <div className="note inline-ic"><IcoBulb size={16} /> <b>Buổi sau:</b> {summary.suggestion}</div>
      )}

      <div className="spacer" />
      <button className="btn btn-primary" onClick={onNew}>Buổi mới</button>
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
