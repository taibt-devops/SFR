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
const MODEL = "claude-opus-4-8";
const API = "https://api.anthropic.com/v1/messages";

// KHÔNG exit khi thiếu token (để container vẫn sống, frontend học-từ vẫn chạy);
// các route gọi Claude sẽ trả 503 tới khi điền CLAUDE_TOKEN vào env và restart.
if (!TOKEN) console.warn("⚠ Chưa có CLAUDE_TOKEN — /mine, /story, chat sẽ trả 503 tới khi điền token (env) và restart proxy.");
if (!SECRET) console.warn("⚠ Chưa đặt PROXY_SECRET — bỏ qua lớp khóa (chỉ nên vậy khi chạy hoàn toàn local/LAN kín).");

// Token OAuth (gói subscription) yêu cầu khối system mở đầu này, kèm header anthropic-beta. Giữ nguyên.
const CODE_PREAMBLE = "You are Claude Code, Anthropic's official CLI for Claude.";

async function callClaude({ system, messages, maxTokens = 600 }) {
  const r = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
      "anthropic-beta": "oauth-2025-04-20",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: "text", text: CODE_PREAMBLE }, { type: "text", text: system }],
      messages,
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
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
  const { history = [], dueWords = [] } = body;
  const text = await callClaude({
    maxTokens: 300,
    system:
      "Bạn là người bạn luyện nói tiếng Anh thân thiện. Trả lời NGẮN (1–3 câu), tự nhiên, " +
      "KHÔNG markdown/emoji (sẽ bị đọc to). Nhẹ nhàng sửa lỗi. Khi hợp ngữ cảnh, gợi/ép dùng các từ: " +
      dueWords.join(", ") + ".",
    messages: history,
  });
  return { text };
}

async function handleMine(body) {
  const { text = "", level = "intermediate" } = body;
  const out = await callClaude({
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

// Coach (§5.2): nhận xét câu người học tự đặt (produce/reverse) + gợi ý sửa — lặp vài lần trước khi lộ đáp án.
async function handleCoach(body) {
  const { word = "", meaning = "", sentence = "", hintVi = "" } = body;
  const text = await callClaude({
    maxTokens: 220,
    system:
      'Bạn là gia sư tiếng Anh thân thiện. Người học đang luyện dùng từ/cụm "' + word + '" (' + meaning + "). " +
      (hintVi ? 'Ý cần diễn đạt (tiếng Việt): "' + hintVi + '". ' : "") +
      "Nhận xét NGẮN bằng tiếng Việt (1–2 câu): câu đã đúng ngữ pháp & tự nhiên chưa, có dùng đúng từ không. " +
      "Nếu chưa ổn, chỉ lỗi nhẹ nhàng và đưa ĐÚNG MỘT câu sửa gợi ý bằng tiếng Anh (đặt trong ngoặc kép). " +
      "Nếu đã tốt thì khen ngắn gọn. KHÔNG markdown, KHÔNG emoji.",
    messages: [{ role: "user", content: sentence || "(người học chưa nhập câu)" }],
  });
  return { text };
}

const ROUTES = { "/": handleChat, "/mine": handleMine, "/story": handleStory, "/coach": handleCoach };

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
      res.statusCode = 502;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
  })
  .listen(PORT, () => console.log(`✓ Proxy Claude chạy ở http://localhost:${PORT} (model ${MODEL})`));
