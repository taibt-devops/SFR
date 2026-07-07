#!/usr/bin/env bash
# Deploy SRF lên server LAN (Docker). Deploy từ commit HEAD → phải commit trước.
# Cách chạy:  bash scripts/deploy.sh            # build lại mọi service (web + proxy)
#             bash scripts/deploy.sh web        # chỉ web (nhanh, khi chỉ đổi frontend)
#             bash scripts/deploy.sh proxy web  # khi đổi cả server/proxy.mjs
set -euo pipefail

HOST="root@192.168.100.162"
DIR="/opt/srf"
TARBALL="srf-deploy.tar.gz"
APP_URL="https://english.forbible.org/"
SERVICES="$*"   # rỗng = build tất cả service (whisper là image pull nên --build bỏ qua)

# 0) Cảnh báo nếu còn thay đổi chưa commit (deploy lấy từ HEAD, KHÔNG gồm file chưa commit).
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠  Có thay đổi CHƯA COMMIT — deploy chạy từ HEAD nên sẽ KHÔNG gồm chúng."
  echo "   Commit trước rồi chạy lại (hoặc Ctrl-C để dừng). Tiếp tục sau 3s..."
  sleep 3
fi

echo "==> [1/5] Build production"
npm run build

echo "==> [2/5] Test (regression guard)"
npm test

echo "==> [3/5] Đóng gói HEAD ($(git rev-parse --short HEAD))"
git archive --format=tar.gz -o "/tmp/$TARBALL" HEAD

echo "==> [4/5] Tải lên $HOST và rebuild ${SERVICES:-tất cả}"
scp "/tmp/$TARBALL" "$HOST:/tmp/$TARBALL"
ssh "$HOST" "cd $DIR && tar xzf /tmp/$TARBALL && docker compose up -d --build $SERVICES"

echo "==> [5/5] Health check"
code=$(curl -fsS -o /dev/null -w '%{http_code}' "$APP_URL" || echo "ERR")
echo "   $APP_URL → $code"
[ "$code" = "200" ] && echo "✓ Deploy xong." || { echo "✗ App không trả 200 — kiểm tra 'docker compose logs' trên server."; exit 1; }
