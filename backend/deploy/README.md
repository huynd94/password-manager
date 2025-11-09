Password Manager Backend – Ubuntu 24.04 Deployment

Quick start (Default: via IP)
- SSH vào VPS (Ubuntu 24.04) với quyền sudo.
- Clone dự án lên VPS (hoặc upload source).
- Chạy cài đặt tự động (triển khai cả backend và frontend):
  - Mặc định chạy qua IP (không domain):
    sudo bash backend/deploy/install.sh
    - Frontend được build và phục vụ bởi Nginx tại cổng 80
    - Backend chạy qua systemd, được proxy tại đường dẫn /api
  - Nếu có domain, script tự cấu hình Nginx + (tuỳ chọn) HTTPS:
    sudo bash backend/deploy/install.sh --domain your.domain.com --email you@example.com

What the script does
- Cài Node.js LTS, PostgreSQL, Nginx và (tuỳ chọn) Certbot.
- Tạo DB + user, tạo extension uuid-ossp và bảng users.
- Đồng bộ mã nguồn backend tới /opt/password-manager/backend.
- Cài dependencies, build TypeScript, tạo file env tại /etc/password-manager/env.
- Tạo systemd service password-manager và khởi chạy.
- Build frontend (Vite) và copy sang /var/www/password-manager để Nginx phục vụ.
- Cấu hình Nginx phục vụ frontend và reverse proxy /api => backend.
- (Nếu có domain) tuỳ chọn xin chứng chỉ TLS.

Important paths
- Backend dir: /opt/password-manager/backend
- Frontend web root: /var/www/password-manager
- Env: /etc/password-manager/env
- Systemd: /etc/systemd/system/password-manager.service
- Logs: journalctl -u password-manager -f

CloudPanel-friendly deployment
- Không can thiệp Nginx/Certbot (được quản lý bởi CloudPanel), chỉ thiết lập backend + copy frontend vào Web Root.
- Cài đặt (từ repo root):
  sudo bash backend/deploy/install-cloudpanel.sh --web-root /home/USER/htdocs/DOMAIN/public --domain your.domain.com
  - Tham số bắt buộc: `--web-root` (public document root của site trong CloudPanel)
  - Tuỳ chọn: `--port`, `--db-name`, `--db-user`, `--db-pass`, `--jwt-secret`, `--cors-origin`, `--app-dir`
- Script sẽ hướng dẫn bạn thêm 2 khối cấu hình Nginx trong CloudPanel cho site:
  - location /api { proxy_pass http://127.0.0.1:<PORT>; ... }
  - location / { try_files $uri $uri/ /index.html; }
- Cập nhật lần sau:
  sudo bash backend/deploy/update-cloudpanel.sh --web-root /home/USER/htdocs/DOMAIN/public

Updating to a new version
- Pull code mới, rồi chạy:
  sudo bash backend/deploy/update.sh

Custom arguments
- --domain your.domain.com (tùy chọn)
- --email you@example.com (bắt buộc nếu muốn cấp TLS tự động)
- --port 4000 (mặc định 4000)
- --db-name password_manager
- --db-user password_manager
- --db-pass <mật khẩu DB> (mặc định script sẽ sinh tự động)
- --jwt-secret <chuỗi bí mật JWT> (mặc định script sẽ sinh tự động)
- --cors-origin <origin> (chuỗi hoặc danh sách nguồn được phép CORS). Mặc định:
  - Khi có domain: https://<domain>
  - Khi chạy theo IP: * (cho phép mọi nguồn – thuận tiện cho thử nghiệm)
- --app-dir /opt/password-manager (thư mục cài đặt)

Troubleshooting
- Kiểm tra service: systemctl status password-manager --no-pager -l
- Xem log: journalctl -u password-manager -f
- Kiểm tra Nginx: nginx -t && systemctl reload nginx
- Kiểm tra DB: sudo -u postgres psql -d password_manager -c "\dt"
