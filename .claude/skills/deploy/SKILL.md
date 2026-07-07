---
name: deploy
description: Deploy SRF lên server LAN (Docker) qua SSH. Dùng khi user nói "deploy", "deploy lên server", "đẩy lên server", "cập nhật server", "build và deploy", "ship". Chạy build + test → đóng gói commit HEAD → scp → docker compose up -d --build → health check english.forbible.org.
---

# Deploy SRF lên server

App chạy Docker trên server LAN `root@192.168.100.162` tại `/opt/srf`, expose ra ngoài qua SSH reverse-tunnel → nginx EC2 → `https://english.forbible.org`.

## Quy trình (đã đóng gói trong `scripts/deploy.sh`)

1. **Bảo đảm đã commit.** Deploy lấy từ **commit HEAD** (`git archive`) — thay đổi chưa commit sẽ KHÔNG lên. Nếu working tree bẩn, commit trước (theo Commit Convention trong CLAUDE.md; KHÔNG commit khi test SM-2 fail).
2. Chạy script bằng Bash tool:

   ```bash
   bash scripts/deploy.sh            # build lại web + proxy (mặc định, an toàn)
   bash scripts/deploy.sh web        # chỉ frontend đổi → nhanh hơn
   bash scripts/deploy.sh proxy web  # khi có sửa server/proxy.mjs
   ```

   Script tự: `npm run build` → `npm test` → `git archive HEAD` → `scp` lên server → `docker compose up -d --build <services>` → health check app trả 200.

3. **Báo kết quả** cho user: commit hash đã deploy, service nào rebuild, mã health check. Nếu health check ≠ 200 → bảo user xem `ssh root@192.168.100.162 "cd /opt/srf && docker compose logs --tail 50 <service>"`.

## Chọn service để rebuild
- **web**: mọi thay đổi `src/**`, `index.html`, `vite.config`, `styles.css`.
- **proxy**: chỉ khi đổi `server/proxy.mjs` hoặc `.env` (route/model/secret).
- **whisper**: hầu như không (image pull sẵn; chỉ khi đổi model trong `docker-compose.yml`).
- Không chắc → bỏ trống (rebuild tất cả); `--build` dùng cache nên service không đổi sẽ không bị recreate.

## Kiểm chứng thêm (khi đụng proxy/AI)
Sau deploy, có thể test endpoint (secret = `PROXY_SECRET` trong `/opt/srf/.env`, KHÔNG hardcode/commit):
```bash
curl -s -X POST https://english.forbible.org/api/ping -H "x-proxy-secret: <SECRET>"   # {"ok":true}
```

## Ràng buộc
- KHÔNG đưa token/secret vào script, repo, hay commit (CLAUDE.md C7).
- Trên Windows dùng **Bash tool** để chạy script (script là POSIX sh; scp/ssh/git-archive có trong Git Bash).
- Không đổi hạ tầng server (compose/nginx/tunnel) trong skill này — chỉ deploy code.
