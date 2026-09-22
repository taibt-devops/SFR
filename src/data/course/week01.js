// Tuần 1 — Nói điều mình muốn (track "daily"). Schema: spec §2.2, ràng buộc L1–L5 test ở course.test.js.
//
// `patKey` = mảnh chữ BẮT BUỘC xuất hiện nguyên văn trong mọi câu `ex/drills/words[].en/drills2`.
// Nó biến ràng buộc L4 ("từ vựng phải bám mẫu câu") từ lời khuyên thành thứ test kiểm được.
// `drills` (lõi 15') KHÔNG được chứa từ nào trong `words` — lõi phải chạy độc lập (L2).

export const week01 = [
  {
    day: 1,
    title: "Nói điều mình muốn",
    pat: "I'd like + N / to V",
    patKey: "I'd like",
    patVi: "Tôi muốn... (lịch sự)",
    note: "Lịch sự hơn 'I want' rất nhiều. Người bản xứ gần như luôn dùng câu này khi gọi món, mua đồ, nhờ vả.",
    ex: [
      { en: "I'd like a coffee, please.", vi: "Cho tôi một cà phê." },
      { en: "I'd like to check in, please.", vi: "Tôi muốn nhận phòng." },
      { en: "I'd like the one by the window.", vi: "Tôi muốn cái cạnh cửa sổ." },
    ],
    drills: [
      { vi: "Cho tôi một ly trà.", en: "I'd like a tea." },
      { vi: "Tôi muốn đặt bàn.", en: "I'd like to book a table." },
      { vi: "Tôi muốn xem thực đơn.", en: "I'd like to see the menu." },
    ],
    words: [
      { w: "refill", ipa: "/ˈriːfɪl/", m: "(n) lần rót thêm", en: "I'd like a refill, please.", vi: "Cho tôi rót thêm với." },
      { w: "takeaway", ipa: "/ˈteɪkəweɪ/", m: "(n) đồ mang đi", en: "I'd like it as a takeaway.", vi: "Tôi muốn mang đi." },
      { w: "receipt", ipa: "/rɪˈsiːt/", m: "(n) hoá đơn", en: "I'd like a receipt, please.", vi: "Cho tôi hoá đơn." },
      { w: "upgrade", ipa: "/ˈʌpɡreɪd/", m: "(v) nâng hạng", en: "I'd like to upgrade my room.", vi: "Tôi muốn nâng hạng phòng." },
      { w: "aisle", ipa: "/aɪl/", m: "(n) lối đi giữa (ghế)", en: "I'd like an aisle seat.", vi: "Tôi muốn ghế cạnh lối đi." },
      { w: "later", ipa: "/ˈleɪtə/", m: "(adv) lát nữa", en: "I'd like to pay later.", vi: "Tôi muốn trả tiền sau." },
    ],
    drills2: [
      { vi: "Cho tôi rót thêm và lấy hoá đơn luôn.", en: "I'd like a refill and a receipt, please." },
      { vi: "Tôi muốn ghế cạnh lối đi nếu còn.", en: "I'd like an aisle seat if possible." },
    ],
    scene: "Gọi món ở quán cà phê. Bạn là khách, gia sư là nhân viên. Hãy gọi đồ uống và xin hoá đơn.",
  },

  {
    day: 2,
    title: "Nhờ người khác",
    pat: "Could you + V ...?",
    patKey: "Could you",
    patVi: "Bạn ... được không? (nhờ vả lịch sự)",
    note: "Cách nhờ an toàn nhất — dùng được với người lạ, đồng nghiệp lẫn cấp trên. Lịch sự hơn 'Can you'.",
    ex: [
      { en: "Could you help me, please?", vi: "Bạn giúp tôi được không?" },
      { en: "Could you say that again?", vi: "Bạn nói lại được không?" },
      { en: "Could you wait a moment?", vi: "Bạn đợi một chút được không?" },
    ],
    drills: [
      { vi: "Bạn mở cửa giúp tôi được không?", en: "Could you open the door?" },
      { vi: "Bạn nói chậm lại được không?", en: "Could you speak more slowly?" },
      { vi: "Bạn cho tôi xem cái đó được không?", en: "Could you show me that one?" },
    ],
    words: [
      { w: "spell", ipa: "/spel/", m: "(v) đánh vần", en: "Could you spell that for me?", vi: "Bạn đánh vần giúp tôi được không?" },
      { w: "repeat", ipa: "/rɪˈpiːt/", m: "(v) nhắc lại", en: "Could you repeat the last part?", vi: "Bạn nhắc lại đoạn cuối được không?" },
      { w: "recommend", ipa: "/ˌrekəˈmend/", m: "(v) gợi ý", en: "Could you recommend something local?", vi: "Bạn gợi ý món địa phương được không?" },
      { w: "text", ipa: "/tekst/", m: "(v) nhắn tin", en: "Could you text me the address?", vi: "Bạn nhắn địa chỉ cho tôi được không?" },
      { w: "double-check", ipa: "/ˌdʌblˈtʃek/", m: "(v) kiểm tra lại", en: "Could you double-check the booking?", vi: "Bạn kiểm tra lại đơn đặt được không?" },
      { w: "keep an eye on", ipa: "/kiːp ən aɪ ɒn/", m: "(phr) trông chừng", en: "Could you keep an eye on my bag?", vi: "Bạn trông giúp túi tôi được không?" },
    ],
    drills2: [
      { vi: "Bạn đánh vần tên đó rồi nhắn cho tôi được không?", en: "Could you spell that name and text it to me?" },
      { vi: "Bạn kiểm tra lại giờ bay giúp tôi được không?", en: "Could you double-check the flight time?" },
    ],
    scene: "Ở quầy lễ tân khách sạn. Bạn cần nhờ vài việc trước khi ra ngoài.",
  },

  {
    day: 3,
    title: "Tìm đồ, tìm chỗ",
    pat: "I'm looking for + N",
    patKey: "I'm looking for",
    patVi: "Tôi đang tìm...",
    note: "Tự nhiên hơn 'I want to find'. Dùng cả khi tìm đồ vật, tìm chỗ, lẫn tìm việc.",
    ex: [
      { en: "I'm looking for the train station.", vi: "Tôi đang tìm nhà ga." },
      { en: "I'm looking for a cheaper option.", vi: "Tôi đang tìm lựa chọn rẻ hơn." },
      { en: "I'm looking for my luggage.", vi: "Tôi đang tìm hành lý của mình." },
    ],
    drills: [
      { vi: "Tôi đang tìm nhà vệ sinh.", en: "I'm looking for the toilet." },
      { vi: "Tôi đang tìm một quán cà phê.", en: "I'm looking for a coffee shop." },
      { vi: "Tôi đang tìm khách sạn của tôi.", en: "I'm looking for my hotel." },
    ],
    words: [
      { w: "pharmacy", ipa: "/ˈfɑːməsi/", m: "(n) hiệu thuốc", en: "I'm looking for a pharmacy.", vi: "Tôi đang tìm hiệu thuốc." },
      { w: "ATM", ipa: "/ˌeɪtiːˈem/", m: "(n) máy rút tiền", en: "I'm looking for an ATM.", vi: "Tôi đang tìm máy rút tiền." },
      { w: "souvenir", ipa: "/ˌsuːvəˈnɪə/", m: "(n) quà lưu niệm", en: "I'm looking for a souvenir for my family.", vi: "Tôi đang tìm quà cho gia đình." },
      { w: "refund", ipa: "/ˈriːfʌnd/", m: "(n) sự hoàn tiền", en: "I'm looking for a refund on this ticket.", vi: "Tôi đang muốn hoàn tiền vé này." },
      { w: "exit", ipa: "/ˈeksɪt/", m: "(n) lối ra", en: "I'm looking for the exit.", vi: "Tôi đang tìm lối ra." },
      { w: "bigger size", ipa: "/ˈbɪɡə saɪz/", m: "(n) cỡ lớn hơn", en: "I'm looking for a bigger size.", vi: "Tôi đang tìm cỡ lớn hơn." },
    ],
    drills2: [
      { vi: "Tôi đang tìm máy rút tiền và lối ra.", en: "I'm looking for an ATM and the exit." },
      { vi: "Tôi đang tìm hiệu thuốc gần đây.", en: "I'm looking for a pharmacy near here." },
    ],
    scene: "Bạn vừa hạ cánh và hơi lạc ở sân bay. Hỏi nhân viên vài chỗ bạn cần tìm.",
  },

  {
    day: 4,
    title: "Hỏi có sẵn không",
    pat: "Do you have + N?",
    patKey: "Do you have",
    patVi: "Có ... không?",
    note: "Câu hỏi dùng nhiều nhất trong quán, cửa hàng, khách sạn. Ngắn mà lịch sự.",
    ex: [
      { en: "Do you have a table for two?", vi: "Có bàn cho hai người không?" },
      { en: "Do you have this in black?", vi: "Cái này có màu đen không?" },
      { en: "Do you have any recommendations?", vi: "Bạn có gợi ý gì không?" },
    ],
    drills: [
      { vi: "Có wifi không?", en: "Do you have wifi?" },
      { vi: "Bạn có thực đơn tiếng Anh không?", en: "Do you have an English menu?" },
      { vi: "Còn phòng trống không?", en: "Do you have a free room?" },
    ],
    words: [
      { w: "charger", ipa: "/ˈtʃɑːdʒə/", m: "(n) cục sạc", en: "Do you have a charger I can borrow?", vi: "Bạn có sạc cho mượn không?" },
      { w: "vegetarian", ipa: "/ˌvedʒəˈteəriən/", m: "(adj) chay", en: "Do you have any vegetarian dishes?", vi: "Có món chay không?" },
      { w: "change", ipa: "/tʃeɪndʒ/", m: "(n) tiền lẻ", en: "Do you have change for this note?", vi: "Bạn có đổi tờ này không?" },
      { w: "luggage storage", ipa: "/ˈlʌɡɪdʒ ˈstɔːrɪdʒ/", m: "(n) chỗ gửi hành lý", en: "Do you have luggage storage?", vi: "Có chỗ gửi hành lý không?" },
      { w: "discount", ipa: "/ˈdɪskaʊnt/", m: "(n) giảm giá", en: "Do you have a student discount?", vi: "Có giảm giá cho sinh viên không?" },
      { w: "spare", ipa: "/speə/", m: "(adj) dự phòng", en: "Do you have a spare towel?", vi: "Bạn có khăn dự phòng không?" },
    ],
    drills2: [
      { vi: "Có món chay và chỗ gửi hành lý không?", en: "Do you have vegetarian dishes and luggage storage?" },
      { vi: "Bạn có sạc dự phòng không?", en: "Do you have a spare charger?" },
    ],
    scene: "Bạn vào một nhà hàng lần đầu. Hỏi vài thứ trước khi quyết định ngồi lại.",
  },

  {
    day: 5,
    title: "Hỏi giá",
    pat: "How much is / are ...?",
    patKey: "How much",
    patVi: "... bao nhiêu tiền?",
    note: "Dùng 'is' cho một thứ, 'are' cho nhiều thứ. Thêm 'please' ở cuối là lịch sự ngay.",
    ex: [
      { en: "How much is this?", vi: "Cái này bao nhiêu?" },
      { en: "How much is a ticket to the city?", vi: "Vé vào trung tâm bao nhiêu?" },
      { en: "How much are these together?", vi: "Mấy cái này tổng bao nhiêu?" },
    ],
    drills: [
      { vi: "Một ly cà phê bao nhiêu?", en: "How much is a coffee?" },
      { vi: "Phòng một đêm bao nhiêu?", en: "How much is a room for one night?" },
      { vi: "Mấy cái này bao nhiêu?", en: "How much are these?" },
    ],
    words: [
      { w: "deposit", ipa: "/dɪˈpɒzɪt/", m: "(n) tiền cọc", en: "How much is the deposit?", vi: "Tiền cọc bao nhiêu?" },
      { w: "fare", ipa: "/feə/", m: "(n) giá vé xe", en: "How much is the fare to the airport?", vi: "Giá xe ra sân bay bao nhiêu?" },
      { w: "altogether", ipa: "/ˌɔːltəˈɡeðə/", m: "(adv) tổng cộng", en: "How much is it altogether?", vi: "Tổng cộng bao nhiêu?" },
      { w: "service charge", ipa: "/ˈsɜːvɪs tʃɑːdʒ/", m: "(n) phí phục vụ", en: "How much is the service charge?", vi: "Phí phục vụ bao nhiêu?" },
      { w: "delivery", ipa: "/dɪˈlɪvəri/", m: "(n) phí giao hàng", en: "How much is delivery?", vi: "Phí giao bao nhiêu?" },
      { w: "per person", ipa: "/pə ˈpɜːsn/", m: "(phr) mỗi người", en: "How much is it per person?", vi: "Mỗi người bao nhiêu?" },
    ],
    drills2: [
      { vi: "Tổng cộng cả phí phục vụ là bao nhiêu?", en: "How much is it altogether with the service charge?" },
      { vi: "Tiền cọc mỗi người là bao nhiêu?", en: "How much is the deposit per person?" },
    ],
    scene: "Bạn đang thuê phòng và muốn biết rõ mọi khoản phải trả trước khi đồng ý.",
  },

  // Ngày chốt tuần: không mẫu câu mới. Luồng do spec §3.4 quy định (ôn + CEFR + trò chuyện tự do).
  {
    day: 6,
    title: "Chốt tuần 1 — nói điều mình muốn",
    review: true,
  },
].map((l) => ({ ...l, week: 1, track: "daily" }));

export default week01;
