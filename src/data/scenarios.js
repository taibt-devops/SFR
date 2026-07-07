// Tình huống roleplay cho luyện nói (đề xuất #4): Claude nhập vai đối phương, học viên phải đạt goal.
// Data thuần — title/goal tiếng Việt (hiển thị + chấm), aiRole/userRole mô tả vai cho system prompt.
export const SCENARIOS = [
  {
    id: "interview",
    title: "Phỏng vấn xin việc",
    aiRole: "người phỏng vấn thân thiện nhưng kỹ tính của một công ty",
    userRole: "ứng viên đi phỏng vấn",
    goal: "giới thiệu bản thân, kể được 1 điểm mạnh kèm ví dụ, và hỏi lại ít nhất 1 câu về công việc",
  },
  {
    id: "restaurant",
    title: "Gọi món & khiếu nại ở nhà hàng",
    aiRole: "nhân viên phục vụ nhà hàng lịch sự",
    userRole: "khách đến ăn",
    goal: "gọi món + đồ uống, sau đó khiếu nại lịch sự một vấn đề (món nguội/sai món) và yêu cầu xử lý",
  },
  {
    id: "bargain",
    title: "Thương lượng giá",
    aiRole: "người bán hàng khéo léo ở chợ/cửa hàng, ban đầu ra giá cao",
    userRole: "khách muốn mua",
    goal: "hỏi giá, chê/khen hợp lý và mặc cả để được giảm giá hoặc thêm quà tặng",
  },
  {
    id: "hotel",
    title: "Check-in khách sạn có trục trặc",
    aiRole: "lễ tân khách sạn, hệ thống không thấy booking của khách",
    userRole: "khách đã đặt phòng trước",
    goal: "trình bày booking, giữ bình tĩnh xử lý trục trặc và chốt được phòng (hoặc phương án thay thế)",
  },
  {
    id: "standup",
    title: "Daily standup với đồng nghiệp",
    aiRole: "trưởng nhóm dev nước ngoài, hay hỏi lại chi tiết",
    userRole: "thành viên nhóm báo cáo công việc",
    goal: "báo cáo hôm qua làm gì, hôm nay làm gì, nêu 1 blocker và trả lời câu hỏi của trưởng nhóm",
  },
  {
    id: "smalltalk",
    title: "Small talk với đồng nghiệp mới",
    aiRole: "đồng nghiệp nước ngoài mới vào công ty, cởi mở",
    userRole: "người bắt chuyện làm quen",
    goal: "bắt chuyện tự nhiên, hỏi thăm 2–3 chủ đề (quê quán, sở thích, công việc) và giữ hội thoại không bị đứt",
  },
];

export const pickScenario = (exceptId = "") => {
  const pool = SCENARIOS.filter((s) => s.id !== exceptId);
  return pool[Math.floor(Math.random() * pool.length)];
};
