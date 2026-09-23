// Màn chờ — thứ đầu tiên thấy khi mở app. Đúng MỘT hành động chính (C9).
//
// BA hình dạng, vì ba khoảnh khắc này cần ba thứ khác hẳn nhau:
//
//  • CHƯA HỌC  → lời mời. Checklist việc sắp làm + một nút gradient duy nhất. Núi nhỏ có lớp nét
//    đứt "+1": phần thưởng đang chờ, KHÔNG phải lời nhắc nhở.
//  • ĐÃ XONG   → phần thưởng. Núi làm hero, lớp hôm nay sáng. KHÔNG nút to nào — mời học tiếp ngay
//    lúc vừa xong là biến phần thưởng thành món nợ. "Học trước" tụt xuống một dòng chữ cuối màn.
//  • QUAY LẠI (nghỉ ≥2 ngày) → chào đón, không trách. Núi vẫn nguyên chiều cao đã xây.
//
// KHÔNG một chữ nào về chuỗi bị đứt, về "bỏ lỡ", về "đừng bỏ cuộc". Dải tuần đếm N/4 ngày trong
// tuần chứ không phải chuỗi liên tiếp, nên nghỉ một ngày không xoá gì cả.
//
// CHECKLIST ghi ĐÚNG các nhịp app thật sự chạy. Mockup vẽ 3 bước / 5 phút — đó là bản rút gọn
// CHƯA làm. Ghi 3 bước lên màn đầu trong khi bài học giao 4 nhịp 15 phút là đặt một lời hứa sai ở
// đúng chỗ người ta tin nhất.
import { useState } from "react";
import Mountain from "./Mountain.jsx";
import {
  IcoVolume, IcoVolumeOff, IcoPlay, IcoMasks, IcoChat, IcoArrow, IcoCheck, IcoMic, IcoRedo, IcoStar,
} from "./Icon.jsx";
import { isMuted, setMuted, tick } from "../utils/sfx.js";
import { speak } from "../utils/tts.js";

const BAI_MOI_CHU_DE = 6;
export const MUC_TIEU_TUAN = 4;
export const NGHI_DAI = 2; // nghỉ từ 2 ngày trở lên thì đổi câu chào

// Các nhịp LÕI thật sự chạy, theo đúng thứ tự trong `srs/lesson.js`.
// Dòng "ôn" chỉ hiện khi có việc để ôn — ngày đầu hàng đợi rỗng, liệt kê ra là nói dối.
function nhipLoi(lesson, coOn) {
  const ds = [];
  if (coOn) ds.push({ ic: IcoRedo, b: "Ôn nhanh mẫu cũ", s: "Những câu sắp quên" });
  ds.push({ ic: IcoVolume, b: "Nghe 4 câu, đoán nghĩa", s: "Nghe trước, hiểu sau" });
  ds.push({ ic: IcoStar, b: "Mẫu câu hôm nay", s: lesson?.pat || "" });
  ds.push({ ic: IcoMic, b: "Nói 5 câu bằng mồm", s: "Whisper chấm từng câu" });
  return ds;
}

function Header({ lesson, completed, mute, onToggleMute }) {
  const xong = Math.max(0, Math.min(BAI_MOI_CHU_DE, completed - (lesson.week - 1) * BAI_MOI_CHU_DE));
  return (
    <header className="hd">
      <div className="hd-row">
        <span className="hd-label">Chủ đề {lesson.week} <i>·</i> {xong}/{BAI_MOI_CHU_DE}</span>
        <button className="hd-mute" onClick={onToggleMute} aria-pressed={!mute}
                aria-label={mute ? "Bật âm thanh" : "Tắt âm thanh"}>
          {mute ? <IcoVolumeOff size={18} /> : <IcoVolume size={18} />}
        </button>
      </div>
      <div className="hd-bar" role="presentation">
        <i style={{ width: `${(xong / BAI_MOI_CHU_DE) * 100}%` }} />
      </div>
    </header>
  );
}

// Thẻ bài hôm nay: nói rõ sắp làm gì rồi mới mời bắt đầu — người học không phải đoán thế nào là "xong".
function TheBai({ lesson, coOn, daoThuTu, nhan, onStart }) {
  const buoc = nhipLoi(lesson, coOn);
  return (
    <section className="card lesson">
      <div className="eb">Bài {lesson.day}</div>
      <div className="lt">{lesson.title}</div>
      {/* Chỉ hứa "ôn trước" khi thật sự CÓ dòng ôn trong danh sách. Ghi câu đó trong khi hàng
          đợi rỗng là tự mâu thuẫn ngay trên cùng một thẻ. */}
      <div className="lnote">{daoThuTu && coOn ? "Ôn trước, học sau · " : ""}khoảng 15 phút</div>
      <ul className="steps">
        {buoc.map(({ ic: Ic, b, s }) => (
          <li key={b}>
            <span className="st-ic"><Ic size={18} /></span>
            <div><b>{b}</b>{s && <small>{s}</small>}</div>
            <i className="chk" />
          </li>
        ))}
      </ul>
      <button className="cta" onClick={() => { tick(); onStart(); }}>
        {nhan} <IcoArrow size={18} />
      </button>
    </section>
  );
}

function Week({ days, count }) {
  const dat = count >= MUC_TIEU_TUAN;
  const du = count - MUC_TIEU_TUAN;
  return (
    <section className="wk">
      <p className={`wk-head${dat ? " ok" : ""}`}>
        {dat ? (
          <>Đủ tuần <IcoCheck size={14} />{du > 0 ? ` +${du}` : ""}</>
        ) : count > 0 ? (
          <>Tuần này <b>{count}/{MUC_TIEU_TUAN}</b></>
        ) : (
          // Chưa có ngày nào thì hiện MỤC TIÊU, không hiện "0/4" — mở app ra gặp số 0 là lời chào
          // tệ nhất có thể, và nó cũng chẳng cho biết cần làm bao nhiêu.
          <>Tuần này <i>·</i> mục tiêu <b>{MUC_TIEU_TUAN} ngày</b></>
        )}
      </p>
      <div className="wk-row" role="list" aria-label={`Tuần này ${count} trên ${MUC_TIEU_TUAN} ngày`}>
        {days.map((d) => (
          <div key={d.at} role="listitem" className={`wk-day${d.done ? " is-on" : ""}${d.today ? " now" : ""}`}>
            <span className="wk-dot" />
            <span className="wk-lbl">{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PatternCard({ last, count, wordCount, onProgress, onVocab }) {
  if (!last) return null;
  return (
    <section className="card pcard">
      <div className="pl">Bạn nói được {count} mẫu câu</div>
      <div className="pp">{last.pat}</div>
      {last.example && (
        <div className="pex">
          <span>{last.example}</span>
          <button className="play" onClick={() => speak(last.example)} aria-label={"Nghe: " + last.example}>
            <IcoPlay size={16} />
          </button>
        </div>
      )}
      <div className="links">
        <button className="lnk" onClick={onProgress}>Mẫu câu <IcoArrow size={15} /></button>
        <button className="lnk" onClick={onVocab}>Từ vựng ({wordCount}) <IcoArrow size={15} /></button>
      </div>
    </section>
  );
}

function LuyenThem({ onRoleplay, onChat }) {
  return (
    <section className="more">
      <div className="more-h">Luyện thêm <span>(tuỳ ý)</span></div>
      <div className="more-g">
        <button className="obtn" onClick={onRoleplay}><IcoMasks size={18} /> Đóng vai</button>
        <button className="obtn" onClick={onChat}><IcoChat size={18} /> Trò chuyện</button>
      </div>
    </section>
  );
}

export default function Today({
  lesson, doneToday, completed, week, weekCount, wordCount = 0, last, nghi = 0, coOn = false,
  onStart, onProgress, onVocab, onWarmup, onRoleplay, onChat,
}) {
  const [mute, setMute] = useState(isMuted);
  const quayLai = !doneToday && nghi >= NGHI_DAI && completed > 0;

  const toggleMute = () => {
    const next = !mute;
    setMuted(next);
    setMute(next);
    if (!next) tick();
  };

  if (!lesson) {
    return (
      <div className="screen screen-mid">
        <Mountain days={completed} today celebrate />
        <h1 className="h-title">Bạn đã đi hết {completed} ngày</h1>
        <p className="h-sub">Các chủ đề sau chưa có nội dung — soạn tiếp rồi quay lại.</p>
        <div className="spacer" />
        <LuyenThem onRoleplay={onRoleplay} onChat={onChat} />
        <div className="links">
          <button className="lnk" onClick={onProgress}>Mẫu câu <IcoArrow size={15} /></button>
          <button className="lnk" onClick={onVocab}>Từ vựng ({wordCount}) <IcoArrow size={15} /></button>
        </div>
      </div>
    );
  }

  const wk = <Week days={week} count={weekCount} />;
  const pc = <PatternCard last={last} count={completed} wordCount={wordCount} onProgress={onProgress} onVocab={onVocab} />;
  const lt = <LuyenThem onRoleplay={onRoleplay} onChat={onChat} />;
  const hd = <Header lesson={lesson} completed={completed} mute={mute} onToggleMute={toggleMute} />;

  // ── ĐÃ XONG ──
  if (doneToday) {
    return (
      <div className="screen screen-home">
        {hd}
        <section className="hero">
          <Mountain days={completed} today celebrate vh={124} hmax={110} />
          <p className="done-t"><IcoCheck size={22} /> Xong 1% hôm nay</p>
          <p className="done-s">Núi của bạn: <b>{completed}</b> ngày <i>·</i> Hẹn mai nhé!</p>
        </section>
        {wk}
        {pc}
        {lt}
        <button className="ahead" onClick={() => { tick(); onStart(); }}>
          Học trước: <b>Bài {completed + 1} — {lesson.title}<IcoArrow size={15} /></b>
        </button>
      </div>
    );
  }

  // ── QUAY LẠI SAU NGHỈ ──
  if (quayLai) {
    return (
      <div className="screen screen-home">
        {hd}
        <section>
          <div className="jp" lang="ja">七転び八起き</div>
          <h1 className="greet">Ngã bảy, đứng dậy tám.</h1>
          <p className="sub">Mừng bạn quay lại! Núi của bạn vẫn nguyên: <b>{completed} ngày</b>.</p>
        </section>
        <Mountain days={completed} ghost vh={116} hmax={84} />
        <TheBai lesson={lesson} coOn={coOn} daoThuTu nhan="Tiếp tục 1% hôm nay" onStart={onStart} />
        {wk}
        {pc}
        {lt}
      </div>
    );
  }

  // ── CHƯA HỌC HÔM NAY ──
  return (
    <div className="screen screen-home">
      {hd}
      <h1 className="greet">Hôm nay chỉ cần một mẫu câu</h1>
      <TheBai lesson={lesson} coOn={coOn} nhan="Bắt đầu 1% hôm nay" onStart={onStart} />
      <div className="mrow">
        <div className="mtn">
          <Mountain days={completed} ghost trees={false} vw={120} vh={72} hmax={44} />
        </div>
        <div>
          <b>Núi của bạn: {completed} ngày</b>
          <small>Xong bài hôm nay, núi thêm một lớp</small>
        </div>
      </div>
      {wk}
      {pc}
      {lt}
      <button className="lnk lnk-warm" onClick={onWarmup}>
        Khởi động giọng một phút trước <IcoArrow size={15} />
      </button>
    </div>
  );
}
