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
  const { history = [], dueWords = [], level = "A2", focus = "", topic = "", opener = false } = body;

  // App chủ động MỞ LỜI: chào + 1 câu hỏi mở để bắt đầu chủ đề (học viên khỏi bí "nói gì trước").
  if (opener) {
    const text = await callClaude({
      maxTokens: 120,
      system:
        "Bạn là gia sư luyện nói tiếng Anh thân thiện. MỞ ĐẦU buổi nói: chào thật ngắn rồi đặt MỘT câu hỏi mở " +
        'để học viên bắt đầu nói về chủ đề "' + topic + '". Mức CEFR ' + level +
        " (A1–A2: câu rất đơn giản, chậm rõ; B1–B2: tự nhiên hơn; C1–C2: như người bản xứ). " +
        "Tiếng Anh, 1–2 câu, KHÔNG markdown/emoji.",
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
      "Bạn là gia sư luyện NÓI tiếng Anh thân thiện, dạy theo trình độ. " +
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

// Tổng kết cuối buổi luyện nói: phân tích các câu HỌC VIÊN đã nói → làm tốt / cần luyện / gợi ý buổi sau.
async function handleSummary(body) {
  const { history = [], level = "A2", topic = "" } = body;
  const said = history.filter((m) => m.role === "user").map((m) => m.content).join(" / ");
  const text = await callClaude({
    maxTokens: 360,
    system:
      'Bạn là gia sư tiếng Anh. Đây là các câu HỌC VIÊN đã nói trong buổi (CEFR ' + level + ', chủ đề "' + topic + '"): "' +
      said + '". Tổng kết NGẮN, ấm áp, bằng TIẾNG VIỆT. ' +
      'CHỈ trả JSON: {"wentWell":["..",".."],"toImprove":["..",".."],"suggestion":"1 câu gợi ý cụ thể cho buổi sau"}. ' +
      "wentWell = 1–2 điều họ làm tốt; toImprove = 1–2 điểm cụ thể cần luyện. KHÔNG markdown/emoji, KHÔNG thêm gì ngoài JSON.",
    messages: [{ role: "user", content: said || "(học viên nói rất ít)" }],
  });
  const o = extractJsonObject(text) || {};
  return { wentWell: o.wentWell || [], toImprove: o.toImprove || [], suggestion: o.suggestion || text.trim() };
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

const ROUTES = {
  "/": handleChat,
  "/mine": handleMine,
  "/story": handleStory,
  "/coach": handleCoach,
  "/assess": handleAssess,
  "/summary": handleSummary,
  "/translate": handleTranslate,
  "/patterns": handlePatterns,
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
