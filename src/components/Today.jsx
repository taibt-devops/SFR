// Màn chờ — thứ đầu tiên thấy khi mở app. Đúng MỘT hành động chính.
// Không chọn chủ đề, không chọn trình độ, không chọn chế độ (C9): chương trình đã quyết sẵn bài
// của hôm nay, việc của người học chỉ là bấm bắt đầu.
import { TOTAL_DAYS } from "../data/course/outline.js";

export default function Today({ lesson, streak, doneToday, completed, onStart, onProgress, onWarmup }) {
  // Hết phần đã soạn — nói thật thay vì hiện màn trống khó hiểu.
  if (!lesson) {
    return (
      <div className="screen screen-mid">
        <div className="done-mark">✓</div>
        <h1>Bạn đã học hết phần đã soạn</h1>
        <p className="muted">
          {completed}/{TOTAL_DAYS} mẫu câu. Các tuần sau chưa có nội dung — soạn tiếp rồi quay lại.
        </p>
        <div className="spacer" />
        <button className="btn" onClick={onProgress}>Xem tôi nói được gì rồi</button>
      </div>
    );
  }

  const done = doneToday;

  return (
    <div className="screen screen-mid">
      <div className="today-day">
        Ngày {lesson.day} / {TOTAL_DAYS} · tuần {lesson.week}
      </div>
      <div className="today-title">{lesson.title}</div>

      {lesson.review ? (
        <p className="muted">Chốt tuần — không có mẫu câu mới. Ôn lại, chấm trình độ, rồi nói tự do.</p>
      ) : (
        <p className="muted">1% hôm nay là một mẫu câu mới. 15 phút, nói bằng mồm.</p>
      )}

      <div className="spacer" />

      <button className="btn btn-primary" onClick={onStart}>
        {done ? "Học lại bài hôm nay" : "Bắt đầu — 15 phút"}
      </button>

      <div className="meta-row">
        <span>🔥 {streak} ngày liên tục</span>
        <span>
          {completed}/{TOTAL_DAYS} mẫu câu
        </span>
      </div>

      <button className="btn-link" onClick={onProgress}>Tôi nói được gì rồi</button>
      <button className="btn-link" onClick={onWarmup}>Khởi động nói 1 phút (tuỳ chọn)</button>
    </div>
  );
}
