// Báo cáo tiến bộ ở ngày chốt tuần (§10.6b). So với TUẦN TRƯỚC, không phải điểm tuyệt đối:
// "mạo từ từ 6 lần xuống 1" có nghĩa với người học, "bạn đạt B1" thì không.
import StepShell from "./StepShell.jsx";
import { IcoCheck, IcoDown, IcoUp, IcoDot } from "./Icon.jsx";

function Row({ icon, tone, children }) {
  return (
    <div className="ex-row">
      <span className="inline-ic" style={{ color: tone, flex: "0 0 auto", paddingTop: 3 }}>{icon}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function WeekReport({ lesson, bar, report, onDone }) {
  const empty =
    !report.fixed.length && !report.improved.length && !report.appeared.length && !report.worse.length;

  return (
    <StepShell bar={bar} kicker={`Chốt tuần ${lesson.week}`} title="Tuần này khá lên chỗ nào">
      {empty ? (
        <p className="muted">
          Chưa đủ dữ liệu để so sánh. Học thêm vài ngày nữa là có báo cáo.
        </p>
      ) : (
        <div className="card">
          {report.fixed.map((t) => (
            <Row key={t} icon={<IcoCheck size={15} />} tone="var(--ok)"><b>{t}</b> — tuần này không còn mắc</Row>
          ))}
          {report.improved.map((x) => (
            <Row key={x.tag} icon={<IcoDown size={15} />} tone="var(--lime)">
              <b>{x.tag}</b> — từ {x.before} lần xuống {x.after}
            </Row>
          ))}
          {report.worse.map((x) => (
            <Row key={x.tag} icon={<IcoUp size={15} />} tone="var(--ember)">
              <b>{x.tag}</b> — từ {x.before} lần lên {x.after}
            </Row>
          ))}
          {report.appeared.map((t) => (
            <Row key={t} icon={<IcoDot size={9} />} tone="var(--muted)"><b>{t}</b> — mới xuất hiện tuần này</Row>
          ))}
        </div>
      )}
      <div className="spacer" />
      <button className="btn btn-primary" onClick={onDone}>Bắt đầu chốt tuần</button>
    </StepShell>
  );
}
