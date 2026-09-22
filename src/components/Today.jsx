// Màn chờ — thứ đầu tiên thấy khi mở app. Đúng MỘT hành động chính.
// Không chọn chủ đề, không chọn trình độ, không chọn chế độ (C9): chương trình đã quyết sẵn bài
// của hôm nay, việc của người học chỉ là bấm bắt đầu.
import { TOTAL_DAYS } from "../data/course/outline.js";

export default function Today({
  lesson, streak, doneToday, completed,
  onStart, onProgress, onWarmup, onRoleplay, onChat,
}) {
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
        {/* Hết bài rồi thì nói tự do chính là thứ nên làm tiếp. */}
        <div className="btn-row btn-trio">
          <button className="btn" onClick={onRoleplay}>🎭 Đóng vai</button>
          <button className="btn" onClick={onChat}>💬 Trò chuyện</button>
          <button className="btn" onClick={onWarmup}>🎤 Khởi động</button>
        </div>
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

      {/* Nói tự do — luôn với tới được, KHÔNG phải học xong mới mở khoá.
          Vẫn giữ C9: chỉ có MỘT nút chính ở trên; đây là hàng phụ, không cấu hình gì trước khi vào. */}
      <div className="free-talk">
        <div className="step-kicker">Nói tự do · không tính streak</div>
        <div className="btn-row btn-trio">
          <button className="btn" onClick={onRoleplay}>🎭 Đóng vai</button>
          <button className="btn" onClick={onChat}>💬 Trò chuyện</button>
          <button className="btn" onClick={onWarmup}>🎤 Khởi động</button>
        </div>
      </div>

      <button className="btn-link" onClick={onProgress}>Tôi nói được gì rồi</button>
    </div>
  );
}
