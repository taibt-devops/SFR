// Proxy Claude local — cho tính năng nói (M6) + mining (M10).
// Chạy:  CLAUDE_TOKEN=... PROXY_SECRET=... node server/proxy.mjs   (mặc định cổng 8787)
//
// BẢO MẬT (C6/C7): token Claude Max sống DUY NHẤT ở env của proxy, KHÔNG bao giờ gửi về client.
// Auth OAuth: Authorization: Bearer <token> + header anthropic-beta: oauth-2025-04-20. Model: claude-opus-4-8.
// Node thuần (fetch built-in, Node ≥18) — không thêm SDK/framework nặng.
import http from "node:http";

const PORT = Number(process.env.PROXY_PORT) || 8787;
const TOKEN = process.env.CLAUDE_TOKEN;
const SECRET = process.env.PROXY_SECRET;
const MODEL_SMART = "claude-opus-4-8"; // chất lượng cao — dùng cho mining
const MODEL_FAST = "claude-sonnet-4-6"; // độ trễ thấp — chat/coach/mini-story
const API = "https://api.anthropic.com/v1/messages";

// KHÔNG exit khi thiếu token (để container vẫn sống, frontend học-từ vẫn chạy);
// các route gọi Claude sẽ trả 503 tới khi điền CLAUDE_TOKEN vào env và restart.
if (!TOKEN) console.warn("⚠ Chưa có CLAUDE_TOKEN — /mine, /story, chat sẽ trả 503 tới khi điền token (env) và restart proxy.");
if (!SECRET) console.warn("⚠ Chưa đặt PROXY_SECRET — bỏ qua lớp khóa (chỉ nên vậy khi chạy hoàn toàn local/LAN kín).");

// Token OAuth (gói subscription) yêu cầu khối system mở đầu này, kèm header anthropic-beta. Giữ nguyên.
const CODE_PREAMBLE = "You are Claude Code, Anthropic's official CLI for Claude.";

const CLAUDE_TIMEOUT_MS = 30_000; // tránh treo vô hạn khi API chậm/đứt

async function callClaude({ system, messages, maxTokens = 600, model = MODEL_FAST }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLAUDE_TIMEOUT_MS);
  let r;
  try {
    r = await fetch(API, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
        "anthropic-beta": "oauth-2025-04-20",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: CODE_PREAMBLE }, { type: "text", text: system }],
        messages,
      }),
    });
  } catch (e) {
    const err = new Error(e.name === "AbortError" ? `Claude quá hạn ${CLAUDE_TIMEOUT_MS}ms` : String(e.message || e));
    err.status = 504;
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    const body = await r.text();
    const err = new Error(`anthropic ${r.status}: ${body}`);
    err.status = r.status; // giữ status gốc (401/403/429…) để báo rõ cho client
    throw err;
  }
  const data = await r.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

// Bóc khối JSON (mảng) ra khỏi câu trả lời (phòng khi Claude kèm văn bản). Trả [] nếu hỏng.
function extractJsonArray(text) {
  const s = text.indexOf("[");
  const e = text.lastIndexOf("]");
  if (s === -1 || e === -1 || e < s) return [];
  try {
    const v = JSON.parse(text.slice(s, e + 1));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ── Handlers ──
async function handleChat(body) {
  const { history = [], dueWords = [], level = "A2", focus = "", topic = "", opener = false, recall = "", scenario = null } = body;

  // Mô tả vai (roleplay §đề xuất #4): Claude NHẬP VAI đối phương, học viên phải đạt mục tiêu tình huống.
  const rp = scenario?.title
    ? 'NHẬP VAI tình huống "' + scenario.title + '": bạn là ' + scenario.aiRole + "; học viên là " + scenario.userRole +
      ". Mục tiêu học viên phải đạt: " + scenario.goal + ". GIỮ ĐÚNG VAI suốt hội thoại, phản ứng như người thật " +
      "(được phép làm khó NHẸ đúng kiểu tình huống); khi học viên đạt mục tiêu thì xác nhận tự nhiên trong vai. "
    : "";

  // App chủ động MỞ LỜI: chào + 1 câu hỏi mở để bắt đầu chủ đề (học viên khỏi bí "nói gì trước").
  if (opener) {
    const text = await callClaude({
      maxTokens: 150,
      system: rp
        ? rp + "Nói LỜI THOẠI MỞ MÀN của vai bạn — vào thẳng tình huống, KHÔNG giải thích luật chơi. Mức CEFR " + level +
          " (A1–A2: câu rất đơn giản, chậm rõ; B1–B2: tự nhiên hơn; C1–C2: như người bản xứ). Tiếng Anh, 1–2 câu, KHÔNG markdown/emoji."
        : "Bạn là gia sư luyện nói tiếng Anh thân thiện, NHỚ học viên qua các buổi. MỞ ĐẦU buổi nói. " +
          (recall
            ? "Buổi trước học viên cần luyện: " + recall + ". Hãy nhắc lại điều này thật NHẸ & ẤM ÁP bằng tiếng Anh (1 câu ngắn, kiểu 'Last time we worked on… let's keep an eye on it today'), RỒI "
            : "") +
          'đặt MỘT câu hỏi mở để học viên bắt đầu nói về chủ đề "' + topic + '". Mức CEFR ' + level +
          " (A1–A2: câu rất đơn giản, chậm rõ; B1–B2: tự nhiên hơn; C1–C2: như người bản xứ). " +
          "Tiếng Anh, " + (recall ? "2–3 câu" : "1–2 câu") + ", KHÔNG markdown/emoji.",
      messages: [{ role: "user", content: "Bắt đầu." }],
    });
    return { text };
  }

  // API yêu cầu message đầu là 'user'. Nếu lịch sử mở đầu bằng assistant (câu chào), chèn 1 user mồi.
  let msgs = history;
  if (msgs.length && msgs[0].role !== "user") {
    msgs = [{ role: "user", content: "Let's begin the speaking session." }, ...msgs];
  }
  const text = await callClaude({
    messages: msgs,
    maxTokens: 320,
    system:
      (rp || "Bạn là gia sư luyện NÓI tiếng Anh thân thiện, dạy theo trình độ. ") +
      "Trình độ học viên: CEFR " + level + ". ĐIỀU CHỈNH ĐỘ KHÓ cho vừa: " +
      "A1–A2 = câu NGẮN, từ rất thông dụng, nói chậm-rõ; B1–B2 = câu dài hơn, từ đa dạng, vài cụm thành ngữ; " +
      "C1–C2 = nói tự nhiên như người bản xứ, thành ngữ & sắc thái. " +
      "Trả lời tiếng Anh NGẮN (1–3 câu), tự nhiên, KHÔNG markdown/emoji (sẽ bị đọc to). " +
      (topic ? 'Chủ đề buổi nói: "' + topic + '" — bám chủ đề. ' : "") +
      (focus ? "Hãy LÁI hội thoại để học viên luyện đúng điểm cần cải thiện: " + focus + "; sửa các lỗi đó thật nhẹ nhàng. " : "Nhẹ nhàng sửa lỗi. ") +
      "QUAN TRỌNG: nếu câu của học viên KHÔNG rõ nghĩa, rời rạc, hoặc có vẻ bị nghe nhầm (chữ lộn xộn), " +
      "ĐỪNG giả vờ hiểu. Hãy nói nhẹ nhàng rằng bạn chưa nghe rõ, đưa MỘT cách nói lại đơn giản & đúng (một câu mẫu ngắn họ có thể lặp theo), " +
      "rồi mời họ thử nói lại — KHÔNG chuyển chủ đề khi chưa hiểu họ. " +
      "Khi hợp ngữ cảnh, gợi/ép dùng các từ: " + dueWords.join(", ") + ". " +
      "LUÔN kết thúc bằng MỘT câu hỏi hoặc lời mời nói lại.",
  });
  return { text };
}

async function handleMine(body) {
  const { text = "", level = "intermediate" } = body;
  const out = await callClaude({
    model: MODEL_SMART, // mining cần chất lượng trích từ → dùng Opus
    maxTokens: 2000,
    system:
      "Bạn trích từ vựng tiếng Anh ĐÁNG HỌC (mức " + level + ") từ đoạn văn người dùng cung cấp. " +
      "CHỈ trả về một MẢNG JSON, không kèm bất kỳ văn bản nào khác. Mỗi phần tử: " +
      '{"c": chủ đề ngắn tiếng Việt, "v": từ/cụm tiếng Anh, "m": "(loại từ) nghĩa tiếng Việt", ' +
      '"e": câu ví dụ tiếng Anh tự nhiên, "d": dịch tiếng Việt của câu ví dụ, "col": "cụm hay đi kèm · ngăn bằng \\u00b7"}. ' +
      "Bỏ từ quá cơ bản. Tối đa 25 từ.",
    messages: [{ role: "user", content: text.slice(0, 8000) }],
  });
  return { cards: extractJsonArray(out) };
}

// Mini-story (§5.7): sinh 2–3 câu ở đúng trình độ dùng vài từ due → luyện đọc/nghe.
async function handleStory(body) {
  const { dueWords = [], level = "intermediate" } = body;
  const text = await callClaude({
    maxTokens: 220,
    system:
      "Bạn viết một mẩu chuyện CỰC NGẮN (2–3 câu) bằng tiếng Anh ở mức " + level + ", " +
      "tự nhiên, mạch lạc, dùng càng nhiều càng tốt các từ sau: " + dueWords.join(", ") + ". " +
      "KHÔNG markdown, KHÔNG emoji, KHÔNG tiêu đề — chỉ đoạn văn (sẽ được đọc to).",
    messages: [{ role: "user", content: "Viết mini-story." }],
  });
  return { text };
}

// Bóc 1 object JSON ra khỏi câu trả lời (phòng khi Claude kèm chữ). Trả null nếu hỏng.
function extractJsonObject(text) {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e < s) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

// Coach (§5.2): GỢI Ý để người học TỰ sửa câu — KHÔNG đưa câu đáp án hoàn chỉnh (giữ "productive struggle").
// Họ đọc gợi ý → gõ lại → kiểm tra tiếp; muốn xem câu mẫu thì bấm "Hiện đáp án".
async function handleCoach(body) {
  const { word = "", meaning = "", sentence = "", hintVi = "", col = "" } = body;
  const sys =
    "Bạn là MỘT GIA SƯ TIẾNG ANH CHUYÊN NGHIỆP, ấm áp và khích lệ, dạy người Việt. " +
    'Học viên đang tập dùng từ/cụm "' + word + '" (' + meaning + ").";
  const ctx =
    (hintVi ? ' Ý họ muốn diễn đạt: "' + hintVi + '".' : "") +
    (col ? " Collocation hay dùng: " + col + "." : "");
  const rule =
    " Họ vừa viết một câu. Hãy phản hồi như gia sư thật trong lớp 1-kèm-1: nhận ra điều họ làm được, rồi GỢI Ý để họ TỰ sửa." +
    " TUYỆT ĐỐI KHÔNG viết ra câu đúng hoàn chỉnh / câu mẫu (để họ tự nghĩ). Mỗi lần chỉ nhấn MỘT điểm quan trọng nhất, xưng \"bạn\", giọng động viên." +
    ' CHỈ trả JSON: {"verdict":"good|ok|fix","hint":"<1-2 câu tiếng Việt ấm áp: khen điểm được + chỉ HƯỚNG cần sửa' +
    ' (loại lỗi, từ thiếu, thì, mạo từ, collocation tự nhiên hơn...) — KHÔNG đưa nguyên câu trả lời>"}.' +
    " verdict: good=đúng & tự nhiên (khen, mời thử câu khó hơn); ok=đúng nhưng nên hay hơn; fix=có lỗi. KHÔNG thêm gì ngoài JSON.";
  const out = await callClaude({
    maxTokens: 200,
    system: sys + ctx + rule,
    messages: [{ role: "user", content: sentence || "(người học chưa nhập câu)" }],
  });
  const o = extractJsonObject(out) || {};
  return { verdict: o.verdict || "ok", hint: o.hint || out.trim() };
}

// Đánh giá NÓI theo CEFR (GĐ1): chấm transcript + nhịp nói → mức tổng + 4 trục + mạnh/yếu/cần sửa.
// Dùng Opus (MODEL_SMART) vì cần phán đoán chất lượng; gọi 1 lần/bài nên độ trễ chấp nhận được.
async function handleAssess(body) {
  const { transcript = "", seconds = 0, words = 0, wpm = 0, fillers = 0, task = "" } = body;
  const out = await callClaude({
    model: MODEL_SMART,
    maxTokens: 750,
    system:
      "Bạn là giám khảo chấm NÓI tiếng Anh theo CEFR (A1–C2), công tâm, mang tính xây dựng. " +
      'Học viên nói để trả lời đề: "' + task + '". ' +
      'Bản ghi bằng Whisper (CÓ THỂ sai do phát âm/đồng âm — ĐỪNG phạt lỗi chính tả): "' + transcript + '". ' +
      "Nhịp nói: ~" + words + " từ trong " + seconds + "s (≈" + wpm + " từ/phút), " + fillers + " filler. " +
      "Chấm CEFR: mức TỔNG + 4 trục — fluency (trôi chảy & mạch lạc, dựa nhịp nói), lexical (vốn từ), grammar (ngữ pháp), pronunciation. " +
      "PRONUNCIATION: KHÔNG có audio → chỉ ƯỚC LƯỢNG dè dặt từ nhịp nói + chỗ Whisper nghe nhầm; note phải ghi rõ '(ước lượng)'. " +
      'CHỈ trả JSON: {"cefr":"A1|A2|B1|B2|C1|C2","summary":"1 câu tiếng Việt","dims":{"fluency":{"level":"..","note":".."},' +
      '"lexical":{"level":"..","note":".."},"grammar":{"level":"..","note":".."},"pronunciation":{"level":"..","note":".."}},' +
      '"strengths":["..",".."],"weaknesses":["..",".."],"fixes":["..",".."],"tags":["..",".."]}. ' +
      'tags = 2–4 NHÃN LỖI để thống kê, CHỌN ĐÚNG NGUYÊN VĂN từ danh sách: ' +
      '"mạo từ","chia động từ/thì","số ít-số nhiều","giới từ","trật tự từ","từ vựng hạn chế","liên kết-mạch lạc","phát âm","ngập ngừng-trôi chảy". ' +
      "Nếu không có lỗi đáng kể thì tags=[]. Mọi note/strengths/weaknesses/fixes bằng TIẾNG VIỆT, ngắn & cụ thể. KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: transcript || "(học viên không nói gì)" }],
  });
  const o = extractJsonObject(out) || {};
  return o.cefr
    ? o
    : { cefr: "?", summary: out.trim().slice(0, 300), dims: {}, strengths: [], weaknesses: [], fixes: [], tags: [] };
}

// Tổng kết cuối buổi luyện nói: làm tốt / cần luyện / gợi ý buổi sau + RECAST — chọn tối đa 3 câu
// học viên nói mà bản xứ sẽ nói khác đi, viết lại (upgrades) để họ nghe & đọc theo (shadowing câu của CHÍNH MÌNH).
async function handleSummary(body) {
  const { history = [], level = "A2", topic = "", scenario = null } = body;
  const said = history.filter((m) => m.role === "user").map((m) => m.content).join(" / ");
  const goal = scenario?.goal
    ? ' Buổi này là ROLEPLAY "' + scenario.title + '" — mục tiêu học viên: ' + scenario.goal +
      '. Thêm vào JSON: "goalDone":true|false,"goalNote":"1 câu tiếng Việt: đạt/chưa đạt mục tiêu & vì sao".'
    : "";
  const text = await callClaude({
    maxTokens: 700,
    system:
      'Bạn là gia sư tiếng Anh. Đây là các câu HỌC VIÊN đã nói trong buổi (CEFR ' + level + ', chủ đề "' + topic + '"), ngăn bằng " / ": "' +
      said + '". Tổng kết NGẮN, ấm áp, bằng TIẾNG VIỆT. ' +
      'CHỈ trả JSON: {"wentWell":["..",".."],"toImprove":["..",".."],"suggestion":"1 câu gợi ý cụ thể cho buổi sau",' +
      '"upgrades":[{"orig":"câu học viên đã nói (nguyên văn)","better":"cách người bản xứ nói tự nhiên hơn, cùng ý, vừa mức ' + level + '"}]}. ' +
      "wentWell = 1–2 điều họ làm tốt; toImprove = 1–2 điểm cụ thể cần luyện. " +
      "upgrades = tối đa 3 câu ĐÁNG nâng cấp nhất (bỏ qua câu đã tốt / quá ngắn; transcript Whisper có thể nghe nhầm — đừng chọn câu vô nghĩa); " +
      "better bằng TIẾNG ANH, không markdown (sẽ được đọc to). Nếu không có câu nào đáng sửa thì upgrades=[]." +
      goal + " KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: said || "(học viên nói rất ít)" }],
  });
  const o = extractJsonObject(text) || {};
  return {
    wentWell: o.wentWell || [],
    toImprove: o.toImprove || [],
    suggestion: o.suggestion || text.trim(),
    upgrades: Array.isArray(o.upgrades) ? o.upgrades.filter((u) => u?.orig && u?.better).slice(0, 3) : [],
    ...(scenario?.goal ? { goalDone: !!o.goalDone, goalNote: o.goalNote || "" } : {}),
  };
}

// Tra nghĩa nhanh: dịch 1 từ/cụm (hoặc cả câu) sang tiếng Việt theo NGỮ CẢNH. Dùng khi đang luyện nói.
async function handleTranslate(body) {
  const { word = "", context = "" } = body;
  const text = await callClaude({
    maxTokens: 90,
    system:
      "Bạn là từ điển Anh–Việt cực ngắn gọn. Cho nghĩa tiếng Việt của từ/cụm/câu tiếng Anh THEO NGỮ CẢNH câu. " +
      "Nếu là 1 từ/cụm: trả nghĩa ngắn (kèm loại từ nếu cần). Nếu là cả câu: dịch ngắn gọn. " +
      "CHỈ trả nghĩa tiếng Việt, KHÔNG giải thích dài dòng, KHÔNG markdown.",
    messages: [{ role: "user", content: 'Câu: "' + context + '"\nDịch: "' + word + '"' }],
  });
  return { vi: text.trim() };
}

// Phiên âm IPA (General American) của 1 từ/cụm — cho mặt sau thẻ. Client cache localStorage.
async function handleIpa(body) {
  const { word = "" } = body;
  const text = await callClaude({
    maxTokens: 40,
    system:
      "Bạn cho phiên âm IPA (General American) của từ/cụm tiếng Anh. " +
      "CHỈ trả chuỗi IPA đặt trong dấu /.../, KHÔNG kèm chữ thường, KHÔNG giải thích, KHÔNG markdown. " +
      "Ví dụ: 'reliable' → /rɪˈlaɪəbəl/ ; 'carry out' → /ˈkæri aʊt/",
    messages: [{ role: "user", content: word }],
  });
  return { ipa: text.trim() };
}

// Việt → Anh (spec Phần 11). Ngược chiều với /translate (Anh → Việt, dùng khi bấm vào từ lúc nói).
// Trả JSON cứng để giao diện không phải đoán; srs/ask.js:sanitizeAnswer làm sạch lần nữa ở client.
async function handleAsk(body) {
  const { vi = "" } = body;
  const out = await callClaude({
    maxTokens: 300,
    system:
      "Bạn là gia sư tiếng Anh cho người Việt. Người học đưa một câu TIẾNG VIỆT, bạn cho biết người " +
      "bản xứ THẬT SỰ nói câu đó thế nào. " +
      'CHỈ trả JSON: {"en":"..","ipa":"/../","use":"..","say":"..","alt":{"en":"..","ipa":"/../","note":".."}}. ' +
      "en = ĐÚNG MỘT câu tự nhiên nhất người bản xứ dùng — KHÔNG dịch sát từng chữ. " +
      "ipa = IPA General American, đặt trong /.../. " +
      "use = tối đa 2 câu TIẾNG VIỆT: trang trọng hay thân mật, dùng ở đâu, khác biệt Anh–Mỹ nếu có. " +
      // Bản đầu chỉ ghi "chỉ khi có bẫy thật" — gọi thử 3 câu thì CẢ 3 đều có mẹo, trong đó một
      // mẹo sai hẳn ("check" khác "czech", thật ra hai từ đọc giống nhau). Bảo model đưa mẹo thì
      // nó luôn đưa. Phải nói rõ MẶC ĐỊNH là rỗng và liệt kê đúng loại bẫy được tính.
      'say = MẶC ĐỊNH là "" (chuỗi rỗng). Phần lớn câu KHÔNG có bẫy — đừng cố tìm cho ra. ' +
      "Chỉ điền khi chính câu này có một lỗi NGƯỜI VIỆT thật sự hay mắc: nuốt âm cuối (s/z/t/d/k), " +
      "âm /θ/ /ð/, nguyên âm dài–ngắn dễ lẫn (/ʊ/ với /uː/, /ɪ/ với /iː/), trọng âm đặt sai, chữ câm. " +
      "KHÔNG so sánh với một từ tiếng Anh khác. KHÔNG nhắc điều hiển nhiên. Một câu ngắn tiếng Việt. " +
      "alt = ĐÚNG MỘT cách nói khác, ở mức trang trọng KHÁC với en; note ≤ 5 từ tiếng Việt. " +
      "Người học lỡ gõ tiếng Anh → VẪN trả lời: coi như họ muốn kiểm câu đó, sửa lại cho tự nhiên. " +
      "Câu tiếng Việt mơ hồ → chọn cách hiểu phổ biến nhất VÀ nói rõ ngữ cảnh đã chọn trong use. " +
      "KHÔNG markdown, KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: String(vi).slice(0, 300) }],
  });
  const o = extractJsonObject(out) || {};
  return { en: "", ipa: "", use: "", say: "", alt: null, ...o };
}

// Thêm câu ví dụ cho MỘT từ vựng (spec Phần 12).
// Giới hạn phạm vi rất hẹp — một từ, vài câu — nên đây là chỗ AI sinh nội dung ÍT rủi ro nhất:
// sai một câu ví dụ thì thấy ngay và bỏ qua được, khác hẳn sai trình tự cả giáo trình.
async function handleExamples(body) {
  const { word = "", meaning = "", level = "A2", have = [] } = body;
  const tranh = (Array.isArray(have) ? have : []).filter(Boolean).slice(0, 6);
  const out = await callClaude({
    maxTokens: 500,
    system:
      'Bạn soạn câu ví dụ cho người Việt đang học nói tiếng Anh, trình độ CEFR ' + level + '. ' +
      'CHỈ trả JSON: {"items":[{"en":"..","vi":".."}]} — ĐÚNG 3 câu. ' +
      "en = câu tiếng Anh NGẮN (tối đa 12 từ), đời thường, dùng được ngay trong tình huống thật. " +
      "vi = bản dịch tiếng Việt tự nhiên của chính câu đó. " +
      "MỖI CÂU một tình huống KHÁC nhau, và khác cả những câu đã có. " +
      "Dùng đúng từ được cho, giữ nguyên dạng hoặc chia đúng ngữ pháp. " +
      (tranh.length ? "ĐÃ CÓ (không lặp lại, không diễn đạt lại): " + tranh.join(" | ") + ". " : "") +
      "KHÔNG markdown, KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: "từ: " + String(word).slice(0, 80) + (meaning ? " — nghĩa: " + String(meaning).slice(0, 120) : "") }],
  });
  const o = extractJsonObject(out) || {};
  const items = (Array.isArray(o.items) ? o.items : [])
    .map((x) => ({ en: String(x?.en || "").trim(), vi: String(x?.vi || "").trim() }))
    .filter((x) => x.en);
  if (!items.length) {
    const err = new Error("Claude không trả được câu ví dụ nào — thử lại.");
    err.status = 502;
    throw err;
  }
  return { items };
}

// Mẫu câu/cấu trúc hữu ích để NÓI về một chủ đề, ở đúng trình độ — cho màn Chi tiết chủ đề.
async function handlePatterns(body) {
  const { topic = "", level = "A2" } = body;
  const out = await callClaude({
    maxTokens: 500,
    system:
      'Đưa 5 MẪU CÂU/cấu trúc tiếng Anh hữu ích & tự nhiên để NÓI về chủ đề "' + topic + '" ở mức CEFR ' + level + ". " +
      'CHỈ trả JSON mảng: [{"en":"mẫu câu/cấu trúc tiếng Anh","vi":"nghĩa tiếng Việt ngắn"}]. ' +
      "Thực dụng, dễ dùng khi hội thoại. KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: "chủ đề: " + topic }],
  });
  return { patterns: extractJsonArray(out) };
}

// Sinh tình huống ĐÓNG VAI theo CHỦ ĐỀ từ vựng đang học (map chặt topic). Client fallback kịch bản soạn tay.
async function handleScenario(body) {
  const { topic = "", level = "A2" } = body;
  const out = await callClaude({
    // 300 token KHÔNG đủ cho JSON bốn trường tiếng Việt: đo thật thì 3/5 lượt bị cắt giữa chừng,
    // JSON hỏng, hàm này trả scenario=null kèm HTTP 200 — và màn đóng vai đứng im vĩnh viễn.
    // Vừa nới hạn mức, vừa BẮT NGẮN từng trường: mô tả vai dài 200 ký tự thì trên điện thoại cũng
    // không ai đọc.
    maxTokens: 700,
    system:
      'Bạn thiết kế MỘT tình huống đóng vai (roleplay) để luyện NÓI tiếng Anh xoay quanh chủ đề "' + topic + '" (CEFR ' + level + "). " +
      "Tình huống phải ĐỜI THƯỜNG, cụ thể, có nhiệm vụ hoặc xung đột nhỏ buộc học viên phải nói nhiều. " +
      'CHỈ trả JSON: {"title":"..","aiRole":"..","userRole":"..","goal":".."}. Tất cả bằng tiếng Việt. ' +
      "NGẮN: title tối đa 8 từ, aiRole và userRole mỗi vai tối đa 15 từ, goal tối đa 25 từ. " +
      "goal phải cụ thể và đo được (làm xong thì biết ngay là xong). KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: "chủ đề: " + topic }],
  });
  const o = extractJsonObject(out) || {};
  const du = o.title && o.aiRole && o.userRole && o.goal;
  // Nói rõ vì sao hỏng thay vì trả null im lặng — client phân biệt được "model trả rác" với
  // "mạng hỏng", và log của proxy có dấu vết để lần sau còn tra.
  if (!du) {
    console.warn("⚠ /scenario: JSON không đủ trường, có thể bị cắt. Dài " + out.length + " ký tự.");
    const err = new Error("Claude trả tình huống không đủ trường (có thể bị cắt) — thử lại.");
    err.status = 502;
    throw err;
  }
  return { scenario: { id: "gen", ...o } };
}

// ── TTS (Kokoro local) ──
// Trả BYTES audio (mp3), không JSON — xử lý riêng, không qua ROUTES. Không cần CLAUDE_TOKEN.
const KOKORO_URL = process.env.KOKORO_URL; // vd http://kokoro:8880; thiếu → 503, client fallback Web Speech
const TTS_TIMEOUT_MS = 20_000;

async function handleTts(body, res) {
  if (!KOKORO_URL) {
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ error: "Proxy chưa cấu hình KOKORO_URL" }));
  }
  const { text = "", voice = "af_heart", speed = 1 } = body;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  try {
    const r = await fetch(KOKORO_URL.replace(/\/$/, "") + "/v1/audio/speech", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "kokoro",
        input: String(text).slice(0, 1000), // câu học ngắn; chặn payload bất thường
        voice,
        speed,
        response_format: "mp3",
      }),
    });
    if (!r.ok) throw new Error(`kokoro ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("content-type", "audio/mpeg");
    res.setHeader("cache-control", "no-store"); // client tự cache theo text+voice (Cache API)
    res.end(buf);
  } catch (e) {
    res.statusCode = e.name === "AbortError" ? 504 : 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "TTS lỗi: " + String(e.message || e) }));
  } finally {
    clearTimeout(timer);
  }
}

// Phân tích cuối buổi (spec §10.4). Nhận toàn bộ câu người học nói trong ngày, trả lỗi + 2 câu sửa
// + 1 điều cần chú ý + gợi ý mức nhớ cho lần gặp sau.
//
// Hai điều BẮT BUỘC nói với Claude, đây là chỗ quyết định chất lượng:
//  1. Bản ghi từ nhận dạng giọng CÓ THỂ SAI — bỏ qua sai lệch giống lỗi nghe.
//  2. Nhãn lỗi phải chọn NGUYÊN VĂN từ bảng, trùng bảng của /assess để hồ sơ cộng lại được.
async function handleTutor(body) {
  const { level = "A2", pattern = "", attempts = [], recentErrors = [] } = body;
  const lines = attempts
    .slice(0, 40)
    .map((a, i) => {
      // Dấu vết âm thanh: từ nào bộ giải mã Whisper chật vật nhất (xem utils/speech.js).
      // Đây KHÔNG phải điểm phát âm — prompt bên dưới nói rõ để Claude đừng kết luận quá tay.
      const am = Array.isArray(a.am) && a.am.length
        ? ` | máy nghe chật vật: ${a.am.map((x) => `${x.w} ${x.p}%`).join(", ")}`
        : "";
      return `#${i + 1} | loại=${a.kind || "drill"} | đích: "${a.target}" | nghe được: "${a.heard}" | khớp ${Math.round((a.score || 0) * 100)}%${am}`;
    })
    .join("\n");
  const recent = recentErrors.map((e) => `${e.tag} (${e.count} lần)`).join(", ");

  const out = await callClaude({
    model: MODEL_SMART,
    maxTokens: 900,
    system:
      "Bạn là gia sư nói tiếng Anh, đang xem lại buổi học hôm nay của một học viên người Việt trình độ " + level + ". " +
      (pattern ? 'Mẫu câu hôm nay: "' + pattern + '". ' : "") +
      (recent ? "Lỗi dai dẳng gần đây: " + recent + ". " : "") +
      "QUAN TRỌNG: phần 'nghe được' do Whisper nhận dạng nên CÓ THỂ SAI. " +
      "BỎ QUA mọi sai lệch giống lỗi nghe (âm gần giống, mất âm cuối, nối âm, đồng âm). " +
      "Chỉ bắt lỗi có HÌNH DẠNG NGỮ PHÁP THẬT. Khớp thấp mà câu nghe được vẫn hợp lý → coi là nghe nhầm, KHÔNG phải lỗi. " +
      "THÀ BỎ SÓT CÒN HƠN BỊA RA LỖI. " +
      // Cân bằng lại: lần thử đầu prompt chỉ có câu "thà bỏ sót" nên nó nuốt CẢ lỗi thật —
      // hai câu thiếu mạo từ rành rành vẫn trả errors=[], khiến hồ sơ lỗi không bao giờ tích luỹ
      // được và báo cáo tuần vĩnh viễn rỗng. Lỗi nhận dạng giọng thì NGẪU NHIÊN, còn lỗi người học
      // thì LẶP LẠI CÓ HỆ THỐNG — đó là cách phân biệt.
      "NHƯNG: nghe nhầm thì ngẫu nhiên, còn lỗi thật thì LẶP LẠI. Cùng một kiểu sai xuất hiện ở NHIỀU câu " +
      "(ví dụ nhiều câu cùng thiếu mạo từ, cùng sai thì) → đó là LỖI THẬT, phải ghi vào errors, đừng bỏ qua. " +
      "Thiếu hẳn một từ chức năng bắt buộc (a/an/the, is/are, to) ở nhiều câu KHÔNG phải lỗi nghe. " +
      "Một mình một câu thiếu 'a' thì CÓ THỂ do Whisper nuốt từ — cứ để yên, đừng ghi vào errors. " +
      "focus được phép nhắc trước một điều cần chú ý ngay cả khi chưa đủ bằng chứng để ghi thành lỗi. " +
      // Có thêm dấu vết âm thanh thì phải nói luôn cách đọc nó, không thì Claude sẽ coi con số
      // phần trăm là điểm phát âm và phán "bạn đọc sai từ X" — điều dữ liệu này KHÔNG chứng minh được.
      '"máy nghe chật vật" là độ tin cậy của bộ giải mã, KHÔNG phải điểm phát âm: từ hiếm vẫn có thể ' +
      "điểm thấp dù đọc chuẩn. Dùng nó làm GỢI Ý cho focus (ví dụ nhắc để ý âm cuối), TUYỆT ĐỐI không " +
      "ghi thành lỗi ngữ pháp và không khẳng định người học phát âm sai một từ cụ thể. " +
      "Chỉ khi CÙNG một từ chật vật ở NHIỀU câu thì mới đáng nhắc trong focus. " +
      'CHỈ trả JSON: {"errors":[{"tag":"..","vi":"..","evidence":"..","fix":".."}],"strengths":[".."],' +
      '"focus":"..","drills":[{"vi":"..","en":".."}],"hints":[{"n":1,"q":2,"why":".."}]}. ' +
      "tag CHỌN NGUYÊN VĂN từ: " +
      '"mạo từ","chia động từ/thì","số ít-số nhiều","giới từ","trật tự từ","từ vựng hạn chế","liên kết-mạch lạc","phát âm","ngập ngừng-trôi chảy". ' +
      "focus = ĐÚNG MỘT điều cần chú ý buổi sau, tiếng Việt, ngắn. " +
      "drills = ĐÚNG 2 câu luyện nhắm vào lỗi vừa thấy (vi = câu tiếng Việt để dịch, en = câu tiếng Anh chuẩn). " +
      "hints = nhận xét từng câu, \"n\" là SỐ DÒNG (#1, #2…), q là 2 (chưa nhớ) / 3 (khó) / 4 (tốt) / " +
      "5 (dễ), why ngắn bằng tiếng Việt. Mỗi dòng nhiều nhất một hint. " +
      "Không có lỗi đáng kể thì errors=[]. Mọi chữ tiếng Việt ngắn & cụ thể. KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: lines || "(học viên không nói câu nào)" }],
  });
  const o = extractJsonObject(out) || {};

  // Claude BÁM CHẶT vào số thứ tự dòng: bảo nó copy nguyên văn "pat::1" thì nó vẫn trả "1".
  // Đánh nhau với xu hướng đó rất mỏng manh, nên làm ngược lại — cho nó dùng số dòng (thứ nó tự
  // nhiên muốn làm) rồi TA tự ánh xạ sang itemId thật. Dòng không có itemId (drill của bài, không
  // phải item ôn) thì bỏ hint đó đi.
  const hints = (Array.isArray(o.hints) ? o.hints : [])
    .map((h) => {
      const a = attempts[Number(h?.n) - 1];
      return a?.itemId ? { itemId: a.itemId, q: h.q, why: h.why } : null;
    })
    .filter(Boolean);

  return { errors: [], strengths: [], focus: "", drills: [], ...o, hints };
}

const ROUTES = {
  "/": handleChat,
  "/scenario": handleScenario,
  "/mine": handleMine,
  "/story": handleStory,
  "/coach": handleCoach,
  "/assess": handleAssess,
  "/summary": handleSummary,
  "/translate": handleTranslate,
  "/ipa": handleIpa,
  "/ask": handleAsk,
  "/examples": handleExamples,
  "/patterns": handlePatterns,
  "/tutor": handleTutor,
};

http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); // app local; siết lại khi expose
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-proxy-secret");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.end();

    if (SECRET && req.headers["x-proxy-secret"] !== SECRET) {
      res.statusCode = 401;
      return res.end("unauthorized");
    }

    // Xác thực đăng nhập (mật khẩu = PROXY_SECRET): secret đúng mới tới đây → trả OK. Không cần token.
    if ((req.url || "/").split("?")[0] === "/ping") {
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ ok: true }));
    }

    // TTS: trả audio bytes, không cần CLAUDE_TOKEN → nhánh riêng trước check token.
    if (req.method === "POST" && (req.url || "/").split("?")[0] === "/tts") {
      try {
        let raw = "";
        for await (const c of req) raw += c;
        return await handleTts(JSON.parse(raw || "{}"), res);
      } catch (err) {
        res.statusCode = 400;
        res.setHeader("content-type", "application/json");
        return res.end(JSON.stringify({ error: String(err.message || err) }));
      }
    }

    const handler = ROUTES[(req.url || "/").split("?")[0]];
    if (req.method !== "POST" || !handler) {
      res.statusCode = 404;
      return res.end("not found");
    }
    if (!TOKEN) {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ error: "Proxy chưa cấu hình CLAUDE_TOKEN trên server" }));
    }

    try {
      let raw = "";
      for await (const c of req) raw += c;
      const result = await handler(JSON.parse(raw || "{}"));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(result));
    } catch (err) {
      // 401/403 từ Anthropic = token Claude Max hết hạn/không hợp lệ → báo rõ cách xử lý (C6).
      const auth = err.status === 401 || err.status === 403;
      res.statusCode = auth ? 401 : err.status === 504 ? 504 : err.status === 429 ? 429 : 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        error: auth
          ? "Token Claude hết hạn hoặc không hợp lệ — chạy lại `claude setup-token`, cập nhật CLAUDE_TOKEN (env) rồi restart proxy."
          : err.status === 429
          ? "Claude đang giới hạn tốc độ (429) — thử lại sau giây lát."
          : String(err.message || err),
      }));
    }
  })
  .listen(PORT, () => console.log(`✓ Proxy Claude chạy ở http://localhost:${PORT} (fast: ${MODEL_FAST}, smart: ${MODEL_SMART})`));
