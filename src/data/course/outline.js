// Khung 72 ngày (spec §5) — CHỈ là lộ trình, không phải nội dung bài học.
// Dùng để: (a) màn Tiến bộ hiện "còn bao nhiêu mẫu câu", (b) biết bài kế tiếp cần soạn.
// Nội dung thật nằm ở weekNN.js; `index.js` gộp lại. Ngày `day % 6 === 0` = chốt tuần, không có mẫu mới.

export const outline = [
  // ── Tuần 1 — Nói điều mình muốn ──
  { day: 1, pat: "I'd like + N / to V", patVi: "Tôi muốn... (lịch sự)" },
  { day: 2, pat: "Could you + V ...?", patVi: "Nhờ ai làm gì" },
  { day: 3, pat: "I'm looking for + N", patVi: "Tôi đang tìm..." },
  { day: 4, pat: "Do you have + N?", patVi: "Có ... không?" },
  { day: 5, pat: "How much is / are ...?", patVi: "Bao nhiêu tiền?" },
  { day: 6, review: true },

  // ── Tuần 2 — Nói về bản thân ──
  { day: 7, pat: "I work as + N / at + N", patVi: "Tôi làm nghề... / ở..." },
  { day: 8, pat: "I've been ...ing for + time", patVi: "Tôi làm ... được bao lâu rồi" },
  { day: 9, pat: "I'm into + N / I like ...ing", patVi: "Tôi thích..." },
  { day: 10, pat: "I usually + V", patVi: "Thói quen" },
  { day: 11, pat: "I'm not really + adj", patVi: "Phủ định nhẹ, tránh nói cộc" },
  { day: 12, review: true },

  // ── Tuần 3 — Hỏi đường & đi lại ──
  { day: 13, pat: "How do I get to + place?", patVi: "Đi tới ... bằng cách nào?" },
  { day: 14, pat: "Where's the nearest + N?", patVi: "... gần nhất ở đâu?" },
  { day: 15, pat: "Is it far from + N?", patVi: "Có xa ... không?" },
  { day: 16, pat: "I need to get to ... by + time", patVi: "Tôi cần tới ... trước..." },
  { day: 17, pat: "Could you tell me when to get off?", patVi: "Nhờ báo khi nào xuống" },
  { day: 18, review: true },

  // ── Tuần 4 — Ăn uống & nhà hàng ──
  { day: 19, pat: "I'll have the + N", patVi: "Tôi gọi món..." },
  { day: 20, pat: "Does it come with + N?", patVi: "Có kèm ... không?" },
  { day: 21, pat: "I'm allergic to + N", patVi: "Tôi dị ứng..." },
  { day: 22, pat: "Could we get the bill, please?", patVi: "Cho tính tiền" },
  { day: 23, pat: "It's a bit too + adj", patVi: "Hơi quá ... (phàn nàn nhẹ)" },
  { day: 24, review: true },

  // ── Tuần 5 — Kể chuyện đã xảy ra ──
  { day: 25, pat: "I went to ... last + time", patVi: "Tôi đã đi ... hôm..." },
  { day: 26, pat: "It was + adj because ...", patVi: "Nó ... vì..." },
  { day: 27, pat: "First ..., then ..., after that ...", patVi: "Kể theo trình tự" },
  { day: 28, pat: "I've never + p.p.", patVi: "Tôi chưa từng..." },
  { day: 29, pat: "It turned out (that) ...", patVi: "Hoá ra là..." },
  { day: 30, review: true },

  // ── Tuần 6 — Xử lý trục trặc & lịch sự ──
  { day: 31, pat: "Sorry, I didn't catch that.", patVi: "Xin lỗi, tôi chưa nghe kịp" },
  { day: 32, pat: "There's a problem with + N", patVi: "Có vấn đề với..." },
  { day: 33, pat: "Would it be possible to + V?", patVi: "Liệu có thể ... không?" },
  { day: 34, pat: "I'd rather + V than + V", patVi: "Tôi thà ... còn hơn..." },
  { day: 35, pat: "Actually, I think ...", patVi: "Nói khác ý một cách nhẹ nhàng" },
  { day: 36, review: true },

  // ── Tuần 7 — Giới thiệu bản thân (nghề nghiệp) ──
  { day: 37, pat: "I'm a + role, and I mainly + V", patVi: "Tôi là ..., chủ yếu làm..." },
  { day: 38, pat: "My day-to-day involves + Ving", patVi: "Công việc hằng ngày gồm..." },
  { day: 39, pat: "I'm responsible for + N/Ving", patVi: "Tôi phụ trách..." },
  { day: 40, pat: "I've been working with + N for + time", patVi: "Tôi dùng ... được ... rồi" },
  { day: 41, pat: "What I enjoy most is + Ving", patVi: "Điều tôi thích nhất là..." },
  { day: 42, review: true },

  // ── Tuần 8 — Kể dự án đã làm (khung STAR) ──
  { day: 43, pat: "We were facing + N", patVi: "Bối cảnh: chúng tôi gặp..." },
  { day: 44, pat: "My task was to + V", patVi: "Nhiệm vụ của tôi là..." },
  { day: 45, pat: "What I did was + V", patVi: "Việc tôi đã làm là..." },
  { day: 46, pat: "As a result, we + V-ed", patVi: "Kết quả là..." },
  { day: 47, pat: "The tricky part was + Ving", patVi: "Chỗ khó là..." },
  { day: 48, review: true },

  // ── Tuần 9 — Họp & bất đồng ──
  { day: 49, pat: "Just to make sure I understand, ...", patVi: "Xác nhận lại cho chắc" },
  { day: 50, pat: "I see your point, but ...", patVi: "Hiểu ý bạn, nhưng..." },
  { day: 51, pat: "Let me walk you through + N", patVi: "Để tôi đi qua từng bước..." },
  { day: 52, pat: "I'd suggest we + V", patVi: "Tôi đề xuất mình..." },
  { day: 53, pat: "Can we circle back to + N?", patVi: "Quay lại ... sau được không?" },
  { day: 54, review: true },

  // ── Tuần 10 — Giải thích sự cố ──
  { day: 55, pat: "We're seeing + N", patVi: "Chúng tôi đang thấy (triệu chứng)..." },
  { day: 56, pat: "It started happening after ...", patVi: "Bắt đầu xảy ra sau khi..." },
  { day: 57, pat: "The root cause turned out to be ...", patVi: "Nguyên nhân gốc hoá ra là..." },
  { day: 58, pat: "To fix it, we + V-ed", patVi: "Để sửa, chúng tôi đã..." },
  { day: 59, pat: "To prevent this, we're going to + V", patVi: "Để ngăn tái diễn, chúng tôi sẽ..." },
  { day: 60, review: true },

  // ── Tuần 11 — Phỏng vấn ──
  { day: 61, pat: "In my previous role, I + V-ed", patVi: "Ở công ty trước, tôi đã..." },
  { day: 62, pat: "I tend to + V", patVi: "Tôi thường có xu hướng..." },
  { day: 63, pat: "I'm looking for a role where ...", patVi: "Tôi tìm vị trí mà..." },
  { day: 64, pat: "Could you tell me more about + N?", patVi: "Hỏi ngược nhà tuyển dụng" },
  { day: 65, pat: "What does success look like in this role?", patVi: "Câu hỏi ghi điểm cuối buổi" },
  { day: 66, review: true },

  // ── Tuần 12 — Remote & thương lượng ──
  { day: 67, pat: "I'm based in ..., which is + N hours ahead of ...", patVi: "Múi giờ" },
  { day: 68, pat: "I'm flexible on ..., but I'd need ...", patVi: "Linh hoạt nhưng cần..." },
  { day: 69, pat: "My expectation is around + N", patVi: "Mức mong đợi khoảng..." },
  { day: 70, pat: "I'll follow up with + N by + time", patVi: "Tôi sẽ gửi ... trước..." },
  { day: 71, pat: "Just to confirm, we agreed on ...", patVi: "Chốt lại thoả thuận" },
  { day: 72, review: true },
].map((o) => ({ ...o, week: Math.ceil(o.day / 6), track: o.day <= 36 ? "daily" : "work" }));

export const TOTAL_DAYS = outline.length;
export default outline;
