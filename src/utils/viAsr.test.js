import { describe, expect, it } from "vitest";
import { isAsrJunk, boDau } from "./viAsr.js";

describe("boDau", () => {
  it("bỏ dấu và đ", () => expect(boDau("Đăng ký kênh nhé")).toBe("dang ky kenh nhe"));
  it("gộp khoảng trắng", () => expect(boDau("  Cho   tôi  ")).toBe("cho toi"));
  it("rỗng/null an toàn", () => {
    expect(boDau(null)).toBe("");
    expect(boDau(undefined)).toBe("");
  });
});

describe("isAsrJunk", () => {
  // Đây là những chuỗi THẬT đo được từ Whisper khi đưa audio nó không nghe ra.
  it("bắt rác phụ đề YouTube đã gặp thật", () => {
    expect(isAsrJunk("Cảm ơn các bạn đã theo dõi và hẹn gặp lại.")).toBe(true);
    expect(isAsrJunk("Hãy đăng ký kênh để ủng hộ kênh của mình nhé!")).toBe(true);
    expect(isAsrJunk("Hãy subscribe cho kênh La La School Để không bỏ lỡ những video hấp dẫn")).toBe(true);
    expect(isAsrJunk("Chào tạm biệt các bạn!")).toBe(true);
  });

  it("bắt được dù gõ không dấu hoặc khác hoa thường", () => {
    expect(isAsrJunk("HAY DANG KY KENH")).toBe(true);
    expect(isAsrJunk("nhớ đăng ký kênh nha")).toBe(true);
  });

  it("rỗng hoặc chỉ dấu câu → rác", () => {
    expect(isAsrJunk("")).toBe(true);
    expect(isAsrJunk("   ")).toBe(true);
    expect(isAsrJunk("...")).toBe(true);
    expect(isAsrJunk("?!")).toBe(true);
    expect(isAsrJunk(null)).toBe(true);
  });

  it("câu hỏi thật thì KHÔNG bị chặn", () => {
    expect(isAsrJunk("cho tôi xin hoá đơn")).toBe(false);
    expect(isAsrJunk("nhà vệ sinh ở đâu")).toBe(false);
    expect(isAsrJunk("anh có thể nói chậm hơn không")).toBe(false);
    expect(isAsrJunk("tôi muốn đổi chuyến bay")).toBe(false);
  });

  it("câu nghe chưa chuẩn nhưng có nội dung vẫn cho qua — người dùng tự sửa được", () => {
    expect(isAsrJunk("Cho tôi mô lai níu ác đơ.")).toBe(false);
  });

  it("KHÔNG chặn nhầm câu hợp lệ có chữ gần giống", () => {
    // "đăng" một mình không phải dấu hiệu rác
    expect(isAsrJunk("tôi muốn đăng ký lớp học")).toBe(false);
    expect(isAsrJunk("cho tôi xem thực đơn")).toBe(false);
  });
});
