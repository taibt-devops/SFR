import { describe, expect, it } from "vitest";
import { loiTiengViet } from "./loiMang.js";

describe("loiTiengViet", () => {
  it("quá hạn chờ → nói rõ máy chủ im lặng", () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    expect(loiTiengViet(e)).toMatch(/không trả lời/);
  });

  it("401/403 → bảo đăng nhập lại", () => {
    expect(loiTiengViet(new Error("proxy lỗi 401"))).toMatch(/đăng nhập lại/);
    expect(loiTiengViet(new Error("proxy lỗi 403"))).toMatch(/đăng nhập lại/);
  });

  // Bản cũ viết `/401|403/` không có ranh giới từ nên "1401" cũng khớp, và người dùng bị bảo
  // đăng nhập lại vì một lỗi chẳng liên quan.
  it("KHÔNG nhận nhầm số có chứa 401 ở giữa", () => {
    expect(loiTiengViet(new Error("mã 1401 không rõ"))).not.toMatch(/đăng nhập lại/);
    expect(loiTiengViet(new Error("cổng 4030 đóng"))).not.toMatch(/đăng nhập lại/);
  });

  it("5xx → máy chủ trục trặc", () => {
    expect(loiTiengViet(new Error("proxy lỗi 500"))).toMatch(/trục trặc/);
    expect(loiTiengViet(new Error("proxy lỗi 502"))).toMatch(/trục trặc/);
  });

  it("mất mạng → bảo kiểm tra mạng", () => {
    expect(loiTiengViet(new TypeError("Failed to fetch"))).toMatch(/Kiểm tra mạng/);
    expect(loiTiengViet(new Error("NetworkError when attempting to fetch"))).toMatch(/Kiểm tra mạng/);
  });

  it("lỗi lạ → giữ nguyên chuỗi kỹ thuật trong ngoặc để còn báo được", () => {
    const r = loiTiengViet(new Error("chuyện gì đó"), "Chưa lấy được ví dụ");
    expect(r).toContain("Chưa lấy được ví dụ");
    expect(r).toContain("chuyện gì đó");
  });

  it("null/undefined không làm vỡ", () => {
    expect(typeof loiTiengViet(null)).toBe("string");
    expect(typeof loiTiengViet(undefined)).toBe("string");
  });
});
