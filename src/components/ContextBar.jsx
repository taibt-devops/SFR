// Dải ngữ cảnh hiển thị ở đầu mỗi màn con: đang luyện chủ đề gì (+ trình độ nếu là phần nói).
export default function ContextBar({ label, level }) {
  return (
    <div className="ctx-bar">
      Đang luyện: <b style={{ color: "var(--text)" }}>{label}</b>
      {level ? <> · <b style={{ color: "var(--teal)" }}>{level}</b></> : null}
    </div>
  );
}
