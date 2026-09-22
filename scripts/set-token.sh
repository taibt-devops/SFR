#!/usr/bin/env bash
# Xoay CLAUDE_TOKEN cho proxy trên cura-dev.
#
# Cách dùng:
#   1) claude setup-token        # tương tác — đăng nhập + duyệt trong trình duyệt, rồi copy token
#   2) bash scripts/set-token.sh # dán token vào dấu nhắc (KHÔNG hiện lên màn hình)
#
# Token đi thẳng từ bàn phím → kiểm chứng với Anthropic → ghi vào /opt/srf/.env qua stdin của ssh.
# KHÔNG bao giờ nằm trong tham số dòng lệnh (ai chạy `ps` cũng thấy), KHÔNG vào lịch sử shell,
# KHÔNG in ra màn hình, KHÔNG ghi vào file tạm trên máy này.
set -euo pipefail

HOST="root@192.168.100.162"
DIR="/opt/srf"
API="https://api.anthropic.com/v1/messages"
MODEL="claude-sonnet-4-6"                                        # = MODEL_FAST trong server/proxy.mjs
PREAMBLE="You are Claude Code, Anthropic's official CLI for Claude."
APP_URL="https://english.forbible.org/"

printf 'Dán token từ `claude setup-token` (gõ/dán xong bấm Enter, màn hình sẽ không hiện gì): '
read -rs TOKEN
printf '\n'
[ -n "${TOKEN:-}" ] || { echo "✗ Không có gì được nhập."; exit 1; }

echo "==> [1/4] Kiểm chứng token với Anthropic (đúng headers mà proxy dùng)"
# Gọi y hệt callClaude() trong proxy.mjs: Bearer + anthropic-beta oauth + khối system mở đầu.
# Kiểm TRƯỚC khi ghi để không thay một token hỏng vào chỗ đang chạy.
# Heredoc thay vì sed: PREAMBLE có dấu nháy đơn, escape bằng sed rất dễ vỡ.
read -r -d '' body <<JSON || true
{"model":"$MODEL","max_tokens":8,"system":[{"type":"text","text":"$PREAMBLE"},{"type":"text","text":"ping"}],"messages":[{"role":"user","content":"hi"}]}
JSON

code=$(curl -sS -o /dev/null -w '%{http_code}' "$API" \
  -H "authorization: Bearer $TOKEN" \
  -H "anthropic-beta: oauth-2025-04-20" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$body" || echo "000")

case "$code" in
  200) echo "    ✓ Token dùng được (HTTP 200)";;
  401|403) echo "    ✗ Anthropic từ chối (HTTP $code) — token sai hoặc đã hết hạn. Chạy lại \`claude setup-token\`."; exit 1;;
  429) echo "    ⚠ HTTP 429 (giới hạn tốc độ) — token có vẻ hợp lệ nhưng đang bị chặn. Thử lại sau."; exit 1;;
  000) echo "    ✗ Không gọi được api.anthropic.com từ máy này (mạng/DNS)."; exit 1;;
  *) echo "    ✗ HTTP $code ngoài dự kiến — dừng, không ghi đè token đang có."; exit 1;;
esac

echo "==> [2/4] Ghi vào $HOST:$DIR/.env (token qua stdin, không qua tham số)"
printf '%s\n' "$TOKEN" | ssh "$HOST" "set -eu
  cd '$DIR'
  tok=\$(cat)
  umask 077
  cp .env .env.bak.\$(date +%Y%m%d-%H%M%S)          # giữ bản cũ phòng khi cần lùi
  grep -v '^CLAUDE_TOKEN=' .env > .env.new || true
  printf 'CLAUDE_TOKEN=%s\n' \"\$tok\" >> .env.new
  mv .env.new .env
  chmod 600 .env
"
unset TOKEN
echo "    ✓ Đã ghi (bản cũ giữ ở .env.bak.*)"

echo "==> [3/4] Tạo lại container proxy"
# PHẢI --force-recreate: env_file chỉ được đọc lúc TẠO container. `restart` sẽ chạy lại
# đúng container cũ với token cũ → tưởng đã xoay mà thực ra chưa.
ssh "$HOST" "cd '$DIR' && docker compose up -d --force-recreate proxy" 2>&1 | tail -3

echo "==> [4/4] Kiểm chứng end-to-end qua proxy"
for i in 1 2 3 4 5 6; do
  out=$(ssh "$HOST" "cd '$DIR' && set -a && . ./.env && set +a && docker compose exec -T proxy sh -lc \
    'wget -qO- --header=\"content-type: application/json\" --header=\"x-proxy-secret: \$PROXY_SECRET\" \
     --post-data=\"{\\\"history\\\":[],\\\"dueWords\\\":[],\\\"opts\\\":{}}\" http://localhost:8787/ 2>&1 | head -c 120'" || true)
  case "$out" in
    *401*|*"error"*) echo "    lần $i: chưa lên — $out"; sleep 4;;
    "") echo "    lần $i: proxy chưa sẵn sàng"; sleep 4;;
    *) echo "    ✓ Claude trả lời qua proxy OK"; break;;
  esac
done

echo
echo "App: $APP_URL"
echo "Xong. Nếu vẫn 401, kiểm tra khối system \"You are Claude Code…\" trong server/proxy.mjs trước tiên."
