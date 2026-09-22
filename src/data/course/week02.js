// Tuần 2 — Nói về bản thân (track "daily"). Đây cũng là nền cho tuần 7-11 (phỏng vấn):
// giới thiệu nghề, kể thâm niên, nói sở thích, kể thói quen, và từ chối cho lịch sự.
// Ràng buộc L1–L5 test ở course.test.js. `drills` lõi KHÔNG được dùng từ trong `words` (L2).

export const week02 = [
  {
    day: 7,
    title: "Giới thiệu công việc",
    pat: "I work as + N / at + N",
    patKey: "I work",
    patVi: "Tôi làm nghề... / làm ở...",
    note: "'as' đi với nghề, 'at' đi với nơi làm, 'with' đi với người hoặc thứ bạn làm cùng.",
    ex: [
      { en: "I work as a DevOps engineer.", vi: "Tôi làm kỹ sư DevOps." },
      { en: "I work at a software company.", vi: "Tôi làm ở một công ty phần mềm." },
      { en: "I work with cloud systems every day.", vi: "Ngày nào tôi cũng làm với hệ thống cloud." },
    ],
    drills: [
      { vi: "Tôi làm giáo viên.", en: "I work as a teacher." },
      { vi: "Tôi làm ở một ngân hàng.", en: "I work at a bank." },
      { vi: "Tôi làm với một nhóm nhỏ.", en: "I work with a small team." },
    ],
    words: [
      { w: "remotely", ipa: "/rɪˈməʊtli/", m: "(adv) từ xa", en: "I work remotely most of the time.", vi: "Tôi làm từ xa là chính." },
      { w: "startup", ipa: "/ˈstɑːtʌp/", m: "(n) công ty khởi nghiệp", en: "I work at a startup.", vi: "Tôi làm ở một startup." },
      { w: "freelance", ipa: "/ˈfriːlɑːns/", m: "(adv) làm tự do", en: "I work freelance on the side.", vi: "Tôi làm tự do thêm bên ngoài." },
      { w: "client", ipa: "/ˈklaɪənt/", m: "(n) khách hàng", en: "I work with clients in Japan.", vi: "Tôi làm với khách hàng ở Nhật." },
      { w: "infrastructure", ipa: "/ˈɪnfrəstrʌktʃə/", m: "(n) hạ tầng", en: "I work on infrastructure and deployment.", vi: "Tôi làm mảng hạ tầng và triển khai." },
      { w: "night shift", ipa: "/naɪt ʃɪft/", m: "(n) ca đêm", en: "I work the night shift twice a week.", vi: "Tôi trực ca đêm hai buổi một tuần." },
    ],
    drills2: [
      { vi: "Tôi làm từ xa cho một startup.", en: "I work remotely for a startup." },
      { vi: "Tôi làm mảng hạ tầng, và làm tự do thêm.", en: "I work on infrastructure, and I work freelance too." },
    ],
    scene: "Bạn gặp một người mới ở sự kiện công nghệ. Họ hỏi bạn làm nghề gì, ở đâu.",
  },

  {
    day: 8,
    title: "Kể thâm niên",
    pat: "I've been ...ing for + time",
    patKey: "I've been",
    patVi: "Tôi đã làm ... được bao lâu rồi (và vẫn đang làm)",
    note: "Việc bắt đầu trong quá khứ và VẪN đang tiếp diễn. Người Việt hay nói nhầm 'I work here 3 years' — người nghe sẽ khựng lại.",
    ex: [
      { en: "I've been working here for three years.", vi: "Tôi làm ở đây được ba năm rồi." },
      { en: "I've been learning English for a while.", vi: "Tôi học tiếng Anh một thời gian rồi." },
      { en: "I've been waiting for twenty minutes.", vi: "Tôi đợi hai mươi phút rồi." },
    ],
    drills: [
      { vi: "Tôi sống ở đây được năm năm rồi.", en: "I've been living here for five years." },
      { vi: "Tôi tập thể dục được ba tuần rồi.", en: "I've been exercising for three weeks." },
      { vi: "Tôi học lái xe được hai tháng rồi.", en: "I've been learning to drive for two months." },
    ],
    words: [
      { w: "on and off", ipa: "/ɒn ənd ɒf/", m: "(phr) lúc có lúc không", en: "I've been studying on and off for years.", vi: "Tôi học lúc có lúc không mấy năm rồi." },
      { w: "ages", ipa: "/ˈeɪdʒɪz/", m: "(n) lâu lắm rồi", en: "I've been using this laptop for ages.", vi: "Tôi dùng cái laptop này lâu lắm rồi." },
      { w: "recently", ipa: "/ˈriːsntli/", m: "(adv) gần đây", en: "I've been feeling tired recently.", vi: "Gần đây tôi thấy mệt." },
      { w: "trying to", ipa: "/ˈtraɪɪŋ tuː/", m: "(phr) cố gắng", en: "I've been trying to speak more English.", vi: "Tôi đang cố nói tiếng Anh nhiều hơn." },
      { w: "since", ipa: "/sɪns/", m: "(prep) từ khi", en: "I've been working here since 2021.", vi: "Tôi làm ở đây từ 2021." },
      { w: "lately", ipa: "/ˈleɪtli/", m: "(adv) dạo này", en: "I've been travelling a lot lately.", vi: "Dạo này tôi đi lại nhiều." },
    ],
    drills2: [
      { vi: "Tôi học kiểu lúc có lúc không mấy năm rồi.", en: "I've been studying on and off for a few years." },
      { vi: "Dạo này tôi cố nói tiếng Anh nhiều hơn.", en: "I've been trying to speak more English lately." },
    ],
    scene: "Phỏng vấn. Nhà tuyển dụng hỏi bạn đã làm mảng này bao lâu và đang học thêm gì.",
  },

  {
    day: 9,
    title: "Nói sở thích",
    pat: "I'm into + N / Ving",
    patKey: "I'm into",
    patVi: "Tôi mê..., tôi khoái...",
    note: "Tự nhiên hơn 'I like' rất nhiều — đây là câu người bản xứ dùng khi nói chuyện phiếm.",
    ex: [
      { en: "I'm into photography.", vi: "Tôi mê chụp ảnh." },
      { en: "I'm into running these days.", vi: "Dạo này tôi mê chạy bộ." },
      { en: "I'm into cooking at the weekend.", vi: "Cuối tuần tôi mê nấu ăn." },
    ],
    drills: [
      { vi: "Tôi mê nhạc.", en: "I'm into music." },
      { vi: "Tôi mê đọc sách.", en: "I'm into reading." },
      { vi: "Tôi mê đi bộ đường dài.", en: "I'm into hiking." },
    ],
    words: [
      { w: "board games", ipa: "/bɔːd ɡeɪmz/", m: "(n) trò chơi bàn cờ", en: "I'm into board games.", vi: "Tôi mê board game." },
      { w: "podcasts", ipa: "/ˈpɒdkɑːsts/", m: "(n) podcast", en: "I'm into podcasts about history.", vi: "Tôi mê podcast về lịch sử." },
      { w: "gardening", ipa: "/ˈɡɑːdnɪŋ/", m: "(n) làm vườn", en: "I'm into gardening these days.", vi: "Dạo này tôi mê làm vườn." },
      { w: "sci-fi", ipa: "/ˈsaɪfaɪ/", m: "(n) khoa học viễn tưởng", en: "I'm into sci-fi movies.", vi: "Tôi mê phim viễn tưởng." },
      { w: "brewing", ipa: "/ˈbruːɪŋ/", m: "(n) việc pha chế", en: "I'm into coffee brewing.", vi: "Tôi mê pha cà phê." },
      { w: "street food", ipa: "/striːt fuːd/", m: "(n) đồ ăn đường phố", en: "I'm into street food.", vi: "Tôi mê đồ ăn đường phố." },
    ],
    drills2: [
      { vi: "Tôi mê podcast và phim viễn tưởng.", en: "I'm into podcasts and sci-fi movies." },
      { vi: "Tôi mê pha cà phê và đồ ăn đường phố.", en: "I'm into coffee brewing and street food." },
    ],
    scene: "Ăn trưa với đồng nghiệp nước ngoài. Họ hỏi ngoài giờ làm bạn thích gì.",
  },

  {
    day: 10,
    title: "Kể thói quen",
    pat: "I usually + V",
    patKey: "I usually",
    patVi: "Tôi thường...",
    note: "Đặt 'usually' TRƯỚC động từ thường. Đây là câu xương sống khi kể một ngày của bạn.",
    ex: [
      { en: "I usually get up at six.", vi: "Tôi thường dậy lúc sáu giờ." },
      { en: "I usually work from home on Fridays.", vi: "Thứ sáu tôi thường làm ở nhà." },
      { en: "I usually skip breakfast.", vi: "Tôi thường bỏ bữa sáng." },
    ],
    drills: [
      { vi: "Tôi thường đi ngủ muộn.", en: "I usually go to bed late." },
      { vi: "Buổi sáng tôi thường uống cà phê.", en: "I usually drink coffee in the morning." },
      { vi: "Cuối tuần tôi thường ở nhà.", en: "I usually stay home at the weekend." },
    ],
    words: [
      { w: "commute", ipa: "/kəˈmjuːt/", m: "(v) đi lại giữa nhà và chỗ làm", en: "I usually commute by motorbike.", vi: "Tôi thường đi làm bằng xe máy." },
      { w: "grab", ipa: "/ɡræb/", m: "(v) mua/lấy nhanh", en: "I usually grab lunch near the office.", vi: "Tôi thường mua đồ ăn trưa gần chỗ làm." },
      { w: "wind down", ipa: "/waɪnd daʊn/", m: "(phr) thư giãn cuối ngày", en: "I usually wind down with a book.", vi: "Tôi thường đọc sách cho thư giãn cuối ngày." },
      { w: "catch up on", ipa: "/kætʃ ʌp ɒn/", m: "(phr) bù lại", en: "I usually catch up on sleep at the weekend.", vi: "Cuối tuần tôi thường ngủ bù." },
      { w: "run late", ipa: "/rʌn leɪt/", m: "(phr) trễ giờ", en: "I usually run late on Mondays.", vi: "Thứ hai tôi thường trễ giờ." },
      { w: "work out", ipa: "/wɜːk aʊt/", m: "(phr) tập thể dục", en: "I usually work out after work.", vi: "Tôi thường tập thể dục sau giờ làm." },
    ],
    drills2: [
      { vi: "Tôi thường đi làm bằng xe máy và hay trễ giờ vào thứ hai.", en: "I usually commute by motorbike and I usually run late on Mondays." },
      { vi: "Tôi thường mua đồ ăn trưa gần chỗ làm rồi tập thể dục sau đó.", en: "I usually grab lunch near the office and work out later." },
    ],
    scene: "Người mới quen hỏi một ngày bình thường của bạn trôi qua thế nào.",
  },

  {
    day: 11,
    title: "Từ chối cho lịch sự",
    pat: "I'm not really + adj",
    patKey: "I'm not really",
    patVi: "Tôi không ... lắm",
    note: "Cách nói 'không' mà không cộc. 'I'm not sure' nghe gắt; thêm 'really' là mềm hẳn — người Anh Mỹ dùng suốt.",
    ex: [
      { en: "I'm not really sure.", vi: "Tôi không chắc lắm." },
      { en: "I'm not really hungry.", vi: "Tôi không đói lắm." },
      { en: "I'm not really good at drawing.", vi: "Tôi vẽ không giỏi lắm." },
    ],
    drills: [
      { vi: "Tôi không mệt lắm.", en: "I'm not really tired." },
      { vi: "Hôm nay tôi không rảnh lắm.", en: "I'm not really free today." },
      { vi: "Tôi không thích cái đó lắm.", en: "I'm not really a fan of that." },
    ],
    words: [
      { w: "comfortable", ipa: "/ˈkʌmftəbl/", m: "(adj) thoải mái", en: "I'm not really comfortable with that.", vi: "Tôi không thoải mái với chuyện đó lắm." },
      { w: "keen on", ipa: "/kiːn ɒn/", m: "(phr) hào hứng với", en: "I'm not really keen on spicy food.", vi: "Tôi không khoái đồ cay lắm." },
      { w: "convinced", ipa: "/kənˈvɪnst/", m: "(adj) bị thuyết phục", en: "I'm not really convinced by that idea.", vi: "Tôi chưa thấy thuyết phục lắm." },
      { w: "fussy", ipa: "/ˈfʌsi/", m: "(adj) khó tính, kén", en: "I'm not really fussy about food.", vi: "Tôi không kén ăn lắm." },
      { w: "morning person", ipa: "/ˈmɔːnɪŋ ˈpɜːsn/", m: "(n) người dậy sớm được", en: "I'm not really a morning person.", vi: "Tôi không phải kiểu dậy sớm được." },
      { w: "up for", ipa: "/ʌp fɔː/", m: "(phr) sẵn sàng tham gia", en: "I'm not really up for going out tonight.", vi: "Tối nay tôi không muốn ra ngoài lắm." },
    ],
    drills2: [
      { vi: "Tôi không thoải mái với ý đó lắm.", en: "I'm not really comfortable with that idea." },
      { vi: "Tôi không khoái đồ cay, mà cũng không kén ăn.", en: "I'm not really keen on spicy food, but I'm not really fussy." },
    ],
    scene: "Đồng nghiệp rủ bạn đi ăn lẩu cay rồi đi hát tối nay. Bạn từ chối nhưng đừng làm họ cụt hứng.",
  },

  {
    day: 12,
    title: "Chốt tuần 2 — nói về bản thân",
    review: true,
  },
].map((l) => ({ ...l, week: 2, track: "daily" }));

export default week02;
