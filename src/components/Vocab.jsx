// "Từ vựng của tôi" — màn riêng, không phải một tab nép trong màn Tiến bộ.
//
// Mỗi bài có 6 từ của riêng nó, nhưng trước đây chúng KHÔNG hiện ở đâu sau khi học xong: app dạy
// một từ rồi không bao giờ cho bạn xem lại nó nữa.
//
// Mức thuộc lấy thẳng từ trạng thái SM-2 (`reps`, `interval`) chứ không tự đếm lại — nó là cùng
// một con số mà hàng đợi ôn đang dùng để quyết khi nào hỏi lại bạn. Hai nơi tự đếm riêng là hai
// nơi sẽ lệch nhau.
import { useMemo, useState } from "react";
import { IcoVolume, IcoBack, IcoStar } from "./Icon.jsx";
import { speak } from "../utils/tts.js";

// Ngưỡng "đã thuộc": SM-2 giãn tới 21 ngày nghĩa là nó tin bạn nhớ được ba tuần.
const THUOC_NGAY = 21;

function mucThuoc(w, state) {
  if (!w.inSrs) return { ma: "cho", nhan: "Chưa luyện" };
  if (!state || !state.reps) return { ma: "moi", nhan: "Mới" };
  if ((state.interval || 0) >= THUOC_NGAY) return { ma: "thuoc", nhan: "Đã thuộc" };
  return { ma: "on", nhan: `Đang ôn · ${state.reps} lần` };
}

const LOC = [
  { ma: "all", nhan: "Tất cả" },
  // Nhóm này gồm cả "Mới" và "Đã thuộc", nên KHÔNG gọi là "đang ôn" — nhãn đó đã dùng cho
  // riêng một mức thuộc, gọi trùng thì bộ lọc "Đang ôn" lại chứa dòng ghi "Đã thuộc".
  { ma: "on", nhan: "Trong lịch ôn" },
  { ma: "cho", nhan: "Chưa luyện" },
  { ma: "mine", nhan: "Tôi tự thêm" },
];

export default function Vocab({ words, getState, onBack }) {
  const [loc, setLoc] = useState("all");

  // Gắn mức thuộc MỘT lần rồi lọc trên kết quả đó — lọc và đếm phải nhìn cùng một dữ liệu, nếu
  // không thì con số trên nút lọc sẽ không khớp với số dòng hiện ra.
  const dsach = useMemo(
    () => words.map((w) => ({ ...w, muc: mucThuoc(w, getState?.(w.id)) })),
    [words, getState]
  );

  const dem = useMemo(() => ({
    all: dsach.length,
    on: dsach.filter((x) => x.muc.ma === "on" || x.muc.ma === "moi" || x.muc.ma === "thuoc").length,
    cho: dsach.filter((x) => x.muc.ma === "cho").length,
    mine: dsach.filter((x) => x.mine).length,
  }), [dsach]);

  const hien = loc === "all" ? dsach
    : loc === "mine" ? dsach.filter((x) => x.mine)
    : loc === "cho" ? dsach.filter((x) => x.muc.ma === "cho")
    : dsach.filter((x) => x.muc.ma !== "cho");

  return (
    <div className="screen">
      <header className="hd">
        <div className="hd-row">
          <span className="hd-label">Từ vựng của tôi</span>
          <button className="hd-mute" onClick={onBack} aria-label="Về màn chính"><IcoBack size={17} /></button>
        </div>
      </header>

      <h1 className="h-title" style={{ marginTop: 4 }}>
        {dem.all} từ {dem.all > 0 && <span className="h-sub-inline">· {dem.on} trong lịch ôn</span>}
      </h1>

      {dsach.length === 0 ? (
        <p className="muted">
          Chưa có từ nào. Mỗi bài có 6 từ riêng — học xong bài đầu tiên là chúng xuất hiện ở đây.
        </p>
      ) : (
        <>
          <div className="chips">
            {LOC.filter((f) => dem[f.ma] > 0 || f.ma === "all").map((f) => (
              <button
                key={f.ma}
                className={`chip${loc === f.ma ? " chip-on" : ""}`}
                onClick={() => setLoc(f.ma)}
              >
                {f.nhan} ({dem[f.ma]})
              </button>
            ))}
          </div>

          <div className="vocab">
            {hien.map((w) => (
              <div className="vocab-item" key={w.id}>
                <div className="vocab-top">
                  <div className="vocab-w">
                    {w.w}
                    {w.mine && <IcoStar size={13} />}
                  </div>
                  <button className="ic-btn" onClick={() => speak(w.en || w.w)} aria-label={"Nghe: " + w.w}>
                    <IcoVolume size={15} />
                  </button>
                </div>
                {(w.ipa || w.m) && (
                  <div className="vocab-sub">
                    {w.ipa && <span className="vocab-ipa">{w.ipa}</span>}
                    {w.m}
                  </div>
                )}
                {w.en && <div className="vocab-ex">{w.en}</div>}
                <div className="vocab-foot">
                  <span className={`vocab-tag tag-${w.muc.ma}`}>{w.muc.nhan}</span>
                  <span className="learned-meta">{w.mine ? `Tự thêm · ngày ${w.day}` : `Bài ${w.day}`}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Nói rõ vì sao có từ chưa luyện, thay vì để người dùng tự đoán. */}
          {dem.cho > 0 && (
            <p className="muted small">
              {dem.cho} từ chưa vào lịch ôn — chúng chỉ vào sau khi bạn làm <b>phần mở rộng</b> của
              ngày đó.
            </p>
          )}
        </>
      )}

      <div className="spacer" />
      <button className="btn" onClick={onBack}>Về màn chính</button>
    </div>
  );
}
