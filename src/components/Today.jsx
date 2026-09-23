// Màn chờ — thứ đầu tiên thấy khi mở app. Đúng MỘT hành động chính (C9).
//
// Hai hình dạng, vì trước và sau khi học xong cần hai thứ khác hẳn nhau:
//
//  • CHƯA HỌC  → lời mời. "Hôm nay chỉ cần 5 phút" + tên bài + một nút gradient duy nhất.
//  • ĐÃ XONG   → phần thưởng. Ngọn núi + "Xong 1% hôm nay" + "Hẹn mai nhé". KHÔNG có nút to nào:
//    kết thúc phải dứt khoát, mời học tiếp ngay lúc vừa xong là biến phần thưởng thành món nợ.
//    "Học trước bài sau" tụt xuống một dòng chữ ở cuối, đủ cho ngày khoẻ tự tìm tới.
//
// Chỉ số chính là TỔNG SỐ NGÀY (ngọn núi) — nó không bao giờ thấp đi. Dải tuần đếm N/4 ngày trong
// tuần, KHÔNG phải chuỗi liên tiếp: nghỉ thứ Tư không xoá gì cả, nên màn này không cần một chữ nào
// về "mất chuỗi" hay "đừng bỏ cuộc".
import { useState } from "react";
import Mountain from "./Mountain.jsx";
import { IcoVolume, IcoVolumeOff, IcoPlay, IcoMasks, IcoChat, IcoArrow, IcoCheck } from "./Icon.jsx";
import { isMuted, setMuted, tick } from "../utils/sfx.js";
import { speak } from "../utils/tts.js";
import { TOTAL_DAYS } from "../data/course/outline.js";

const BAI_MOI_CHU_DE = 6;        // 6 bài một chủ đề
export const MUC_TIEU_TUAN = 4;  // mục tiêu mềm: 4 ngày/tuần là đủ tốt

// ── Header: đang ở đâu trong chủ đề + thanh tiến độ mảnh ──
// Đọc từ `completed` (số bài ĐÃ XONG), KHÔNG từ `lesson.day` (số bài SẮP HỌC). Trước đây header
// lấy số bài sắp học nên nó luôn nhiều hơn thực tế đúng 1: xong 2 bài mà thanh hiện 3/6. Giờ
// header, thanh tiến độ và dòng "Học trước: Bài N" cùng bắt nguồn từ một con số.
function Header({ lesson, completed, mute, onToggleMute }) {
  const xongTrongChuDe = Math.max(0, Math.min(BAI_MOI_CHU_DE, completed - (lesson.week - 1) * BAI_MOI_CHU_DE));
  return (
    <header className="hd">
      <div className="hd-row">
        <span className="hd-label">
          Chủ đề {lesson.week} <i>·</i> {xongTrongChuDe}/{BAI_MOI_CHU_DE}
        </span>
        <button
          className="hd-mute"
          onClick={onToggleMute}
          aria-pressed={!mute}
          aria-label={mute ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {mute ? <IcoVolumeOff size={18} /> : <IcoVolume size={18} />}
        </button>
      </div>
      <div className="hd-bar" role="presentation">
        <i style={{ width: `${(xongTrongChuDe / BAI_MOI_CHU_DE) * 100}%` }} />
      </div>
    </header>
  );
}

// ── Dải tuần: 7 ô có nhãn, hôm nay viền sáng ──
// Hôm nay đánh dấu bằng VIỀN chứ không đổi kích thước ô — đổi kích thước làm cả dải nhảy layout.
// CHỈ ngày đã học có màu. Ngày đã qua mà không học trông giống hệt ngày chưa tới — cố ý: phân
// biệt chúng là ngầm nói "chỗ này đáng lẽ phải có", tức là trách móc. Ở đây bỏ một ngày không
// mất gì, nên dải tuần chỉ đếm cái ĐÃ CÓ, không đánh dấu cái thiếu.
// Hôm nay có khung sáng bao quanh, dùng viền chứ không đổi cỡ ô — đổi cỡ làm cả dải nhảy mỗi ngày.
function Week({ days, count }) {
  const dat = count >= MUC_TIEU_TUAN;
  const du = count - MUC_TIEU_TUAN;
  return (
    <section className="wk">
      <p className={`wk-head${dat ? " ok" : ""}`}>
        {dat
          // KHÔNG hiện "5/4": mẫu số là MỤC TIÊU, vượt qua rồi thì nó hết là thước đo.
          ? <>Đủ tuần <IcoCheck size={14} />{du > 0 ? ` +${du}` : ""}</>
          : <>Tuần này <b>{count}/{MUC_TIEU_TUAN}</b></>}
      </p>
      <div className="wk-row" role="list" aria-label={`Tuần này ${count} trên ${MUC_TIEU_TUAN} ngày`}>
        {days.map((d) => (
          <div
            key={d.at}
            role="listitem"
            className={`wk-day${d.done ? " is-on" : ""}${d.today ? " now" : ""}`}
          >
            <span className="wk-dot" />
            <span className="wk-lbl">{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Card mẫu câu gần nhất ──
// `example` do course.js dựng và LUÔN thuộc đúng bài của `pat`. Trước đây màn này ghép mẫu câu của
// hôm nay với câu của hôm qua, vì câu sửa lỗi do gia sư sinh ra cũng bị ghi làm "câu nói được".
function PatternCard({ last, count, wordCount, onProgress, onVocab }) {
  if (!last) return null;
  return (
    <section className="pc">
      <h2 className="pc-head">Bạn nói được {count} mẫu câu</h2>
      <p className="pc-pat">{last.pat}</p>
      {last.example && (
        <div className="pc-ex">
          <span>{last.example}</span>
          <button className="ic-btn" onClick={() => speak(last.example)} aria-label={"Nghe: " + last.example}>
            <IcoPlay size={16} />
          </button>
        </div>
      )}
      <div className="pc-links">
        <button className="lnk" onClick={onProgress}>
          Mẫu câu <IcoArrow size={15} />
        </button>
        <button className="lnk" onClick={onVocab}>
          Từ vựng ({wordCount}) <IcoArrow size={15} />
        </button>
      </div>
    </section>
  );
}

function LuyenThem({ onRoleplay, onChat }) {
  return (
    <section className="lt">
      <h2 className="lt-head">Luyện thêm <span>(tuỳ ý)</span></h2>
      <div className="lt-row">
        <button className="btn2" onClick={onRoleplay}><IcoMasks size={18} /> Đóng vai</button>
        <button className="btn2" onClick={onChat}><IcoChat size={18} /> Trò chuyện</button>
      </div>
    </section>
  );
}

export default function Today({
  lesson, doneToday, completed, week, weekCount, wordCount, last, lastDone,
  onStart, onProgress, onVocab, onWarmup, onRoleplay, onChat,
}) {
  const [mute, setMute] = useState(isMuted);

  const toggleMute = () => {
    const next = !mute;
    setMuted(next);
    setMute(next);
    if (!next) tick();
  };

  // Hết phần đã soạn — nói thật thay vì hiện một màn trống khó hiểu.
  if (!lesson) {
    return (
      <div className="screen screen-mid">
        <Mountain days={completed} total={TOTAL_DAYS} />
        <h1 className="h-title">Bạn đã đi hết {completed} ngày</h1>
        <p className="h-sub">Các chủ đề sau chưa có nội dung — soạn tiếp rồi quay lại.</p>
        <div className="spacer" />
        <LuyenThem onRoleplay={onRoleplay} onChat={onChat} />
        <div className="pc-links">
          <button className="lnk" onClick={onProgress}>Xem tất cả mẫu câu <IcoArrow size={15} /></button>
          <button className="lnk" onClick={onVocab}>Từ vựng của tôi <IcoArrow size={15} /></button>
        </div>
      </div>
    );
  }

  const wk = <Week days={week} count={weekCount} />;
  const pc = <PatternCard last={last} count={completed} wordCount={wordCount} onProgress={onProgress} onVocab={onVocab} />;

  // ── ĐÃ XONG: phần thưởng, không mời gọi ──
  if (doneToday) {
    return (
      <div className="screen screen-home">
        <Header lesson={lesson} completed={completed} mute={mute} onToggleMute={toggleMute} />

        <section className="hero hero-done">
          <Mountain days={completed} total={TOTAL_DAYS} celebrate />
          <p className="done-tag"><IcoCheck size={16} /> Xong 1% hôm nay</p>
          {/* Số ngày hiện THẲNG, không đếm lên. Đây là THÔNG TIN chứ không phải trang trí: hiệu
              ứng đếm mà không chạy thì người dùng đọc được "0 ngày" — sai, chứ không phải kém
              sinh động. Đếm số để ở màn đóng ngày, đúng khoảnh khắc hoàn thành. */}
          <p className="done-sub">
            Núi của bạn: <b>{completed}</b> ngày <i>·</i> Hẹn mai nhé!
          </p>
        </section>

        {wk}
        {pc}
        <LuyenThem onRoleplay={onRoleplay} onChat={onChat} />

        {/* `completed + 1` chứ không phải `lesson.day`: hai số này phải luôn bằng nhau, nhưng đọc
            từ cùng một nguồn thì chúng KHÔNG THỂ lệch. */}
        <button className="lnk lnk-next" onClick={() => { tick(); onStart(); }}>
          Học trước: Bài {completed + 1} — {lesson.title} <IcoArrow size={15} />
        </button>
      </div>
    );
  }

  // ── CHƯA HỌC: một lời mời, một nút ──
  return (
    <div className="screen screen-home">
      <Header lesson={lesson} completed={completed} mute={mute} onToggleMute={toggleMute} />

      <section className="hero">
        <p className="hero-kicker">Hôm nay chỉ cần 5 phút</p>
        <h1 className="hero-title">
          Bài {lesson.day} <i>·</i> {lesson.title}
        </h1>
        <button className="cta" onClick={() => { tick(); onStart(); }}>
          Bắt đầu 1% hôm nay
        </button>
        <button className="lnk lnk-warm" onClick={onWarmup}>
          Khởi động giọng một phút trước <IcoArrow size={15} />
        </button>
      </section>

      {wk}
      {pc}
      <LuyenThem onRoleplay={onRoleplay} onChat={onChat} />
    </div>
  );
}
