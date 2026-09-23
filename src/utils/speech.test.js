import { describe, expect, it } from "vitest";
import { nhipNgung, tuYeuNhat, tocDo, doNhipNoi, dauVetAmThanh, NGUONG_YEU } from "./speech.js";

// Dữ liệu có hình dạng ĐÚNG NHƯ Whisper trả về thật — đã đo trên bản live:
//   { word: " pharmacy", start: 0.70, end: 1.02, probability: 0.9936 }
// (ai/whisper.js đổi tên `word`→`w`, `probability`→`p` trước khi tới đây)
const cau = [
  { w: "I'm", start: 0.0, end: 0.18, p: 0.96 },
  { w: "looking", start: 0.18, end: 0.38, p: 0.99 },
  { w: "for", start: 0.38, end: 0.6, p: 0.99 },
  { w: "a", start: 0.6, end: 0.7, p: 0.2 },      // điểm thấp nhưng CHỈ 1 ký tự
  { w: "pharmacy", start: 1.9, end: 2.3, p: 0.41 }, // ngập ngừng 1.2s + máy nghe chật vật
];

describe("nhipNgung", () => {
  it("bắt khoảng lặng giữa hai từ, dài nhất lên đầu", () => {
    const r = nhipNgung(cau);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ w: "pharmacy", giay: 1.2 });
  });

  it("nói liền mạch → không có khoảng lặng nào", () => {
    expect(nhipNgung(cau.slice(0, 3))).toEqual([]);
  });

  it("một từ hoặc rỗng → rỗng, không ném lỗi", () => {
    expect(nhipNgung([])).toEqual([]);
    expect(nhipNgung([cau[0]])).toEqual([]);
    expect(nhipNgung()).toEqual([]);
  });
});

describe("tuYeuNhat", () => {
  // Từ một ký tự luôn nhiễu, và "bạn đọc chữ 'a' chưa rõ" là lời khuyên vô dụng.
  it("BỎ QUA từ một ký tự dù điểm thấp nhất", () => {
    expect(tuYeuNhat(cau).w).toBe("pharmacy");
  });

  it("mọi từ đều chắc → null, không bịa ra điểm yếu", () => {
    const chac = cau.slice(0, 3);
    expect(tuYeuNhat(chac)).toBeNull();
  });

  it("thiếu p → bỏ qua từ đó", () => {
    expect(tuYeuNhat([{ w: "hello" }, { w: "world", p: 0.3 }]).w).toBe("world");
    expect(tuYeuNhat([{ w: "hello" }])).toBeNull();
  });

  it("trả phần trăm nguyên, không phải số thập phân", () => {
    expect(tuYeuNhat(cau).p).toBe(41);
  });
});

describe("tocDo", () => {
  // Đo trên khoảng từ-đầu → từ-cuối. Bản cũ chia cho cả thời lượng ghi âm nên ai bấm nút chậm
  // là bị chấm nói chậm oan.
  it("tính trên khoảng nói thật, không tính im lặng hai đầu", () => {
    const w = [
      { w: "one", start: 5.0, end: 5.3, p: 1 },
      { w: "two", start: 5.3, end: 5.6, p: 1 },
      { w: "three", start: 5.6, end: 6.0, p: 1 },
    ];
    expect(tocDo(w)).toBe(180); // 3 từ trong 1 giây
  });

  it("dưới hai từ hoặc mốc thời gian hỏng → null", () => {
    expect(tocDo([])).toBeNull();
    expect(tocDo([cau[0]])).toBeNull();
    expect(tocDo([{ w: "a", start: 2, end: 2 }, { w: "b", start: 2, end: 2 }])).toBeNull();
  });
});

describe("doNhipNoi", () => {
  it("gói đủ số liệu từ một lượt nghe", () => {
    const r = doNhipNoi({ words: cau });
    expect(r.soTu).toBe(5);
    expect(r.yeu.w).toBe("pharmacy");
    expect(r.ngungLau).toEqual({ w: "pharmacy", giay: 1.2 });
    expect(r.soLanNgung).toBe(1);
    expect(r.wpm).toBeGreaterThan(0);
  });

  it("không có từ nào → null (chỗ gọi khỏi phải dò từng trường)", () => {
    expect(doNhipNoi({ words: [] })).toBeNull();
    expect(doNhipNoi(null)).toBeNull();
    expect(doNhipNoi({})).toBeNull();
  });
});

describe("dauVetAmThanh", () => {
  it("chỉ giữ từ đáng ngờ, nhiều nhất 3, yếu nhất trước", () => {
    const w = [
      { w: "alpha", p: 0.5 }, { w: "bravo", p: 0.2 }, { w: "delta", p: 0.9 },
      { w: "echo", p: 0.1 }, { w: "gamma", p: 0.3 },
    ];
    expect(dauVetAmThanh(w && { words: w })).toEqual([
      { w: "echo", p: 10 }, { w: "bravo", p: 20 }, { w: "gamma", p: 30 },
    ]);
  });

  it("cả câu đều chắc → null, không gửi gói rỗng cho gia sư", () => {
    expect(dauVetAmThanh({ words: [{ w: "alpha", p: 0.95 }] })).toBeNull();
    expect(dauVetAmThanh(null)).toBeNull();
  });

  it("ngưỡng khớp với hằng số dùng chung", () => {
    expect(dauVetAmThanh({ words: [{ w: "alpha", p: NGUONG_YEU - 0.01 }] })).toHaveLength(1);
    expect(dauVetAmThanh({ words: [{ w: "alpha", p: NGUONG_YEU + 0.01 }] })).toBeNull();
  });
});
