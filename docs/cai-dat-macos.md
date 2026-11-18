# Cài đặt trên macOS (MacBook chip Apple M1–M4)

Hướng dẫn này bổ sung cho `README.md`, chỉ ghi những chỗ khác với Windows.
Đã tính cho MacBook Air M4, 16GB RAM: đủ chạy cùng lúc SQL Server (Docker), backend, web, Rasa và iOS Simulator.

## 1. Công cụ nền

Mở **Terminal** và chạy lần lượt:

```bash
xcode-select --install                     # bộ công cụ dòng lệnh (có sẵn git)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Làm theo 2 dòng "Next steps" Homebrew in ra cuối cùng để thêm brew vào PATH

brew install node@22 python@3.10
brew link --overwrite --force node@22
brew install --cask docker visual-studio-code
```

Kiểm tra: `node -v` (v22.x), `python3.10 --version` (3.10.x), mở ứng dụng **Docker** một lần để nó khởi động.

## 2. Tắt AirPlay Receiver (bắt buộc)

macOS dùng sẵn **cổng 5000** cho AirPlay Receiver, trùng cổng backend. Nếu không tắt, backend báo
`EADDRINUSE: address already in use :::5000` hoặc web gọi API bị lỗi 403.

**System Settings → General → AirDrop & Handoff → tắt AirPlay Receiver.**

(Cách khác: đổi `PORT` trong `backend/.env` sang 5050 và sửa theo ở `web/.env`, `mobile/.env`, `chatbot/.env`.
Nên tắt AirPlay để cấu hình giống các thành viên dùng Windows.)

## 3. SQL Server bằng Docker

SQL Server không có bản cài cho macOS nên chạy trong Docker:

1. Docker Desktop → **Settings → General** → bật **Use Rosetta for x86_64/amd64 emulation on Apple Silicon** → Apply & restart.
2. Ở thư mục gốc dự án:

```bash
docker compose up -d
docker logs -f library-huit-sql     # đợi dòng "SQL Server is now ready for client connections", Ctrl+C để thoát
```

`backend/.env.example` đã đúng sẵn với Docker (`localhost:1433`, user `sa`, mật khẩu `YourStrong@Passw0rd`).
Bỏ qua toàn bộ mục 2 của README (SSMS, Configuration Manager chỉ dành cho Windows).

Xem và sửa dữ liệu: `npx prisma studio` trong thư mục `backend`, hoặc extension **SQL Server (mssql)** trong VS Code, hoặc **DBeaver**.
Không dùng thì tắt container cho nhẹ máy: `docker compose stop` (dữ liệu vẫn giữ). Bật lại: `docker compose start`.

## 4. Backend và web

Giống README mục 3–4, dùng `cp` để tạo file môi trường:

```bash
cd backend && cp .env.example .env && npm install && npm run db:migrate && npm run db:seed && npm run dev
# terminal khác:
cd web && cp .env.example .env && npm install && npm run dev
```

## 5. Chatbot Rasa

### Cách A — cài trực tiếp (nhanh, nên thử trước)

```bash
cd chatbot
cp .env.example .env
python3.10 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip wheel "setuptools<81"
pip install -r requirements.txt       # Rasa tự chọn tensorflow-macos cho chip Apple
rasa train
rasa run --port 5005                  # terminal 1
rasa run actions                      # terminal 2 (nhớ source .venv/bin/activate trước)
```

Mỗi lần mở terminal mới phải `source .venv/bin/activate`. Nếu `pip install` báo lỗi build (thường ở tensorflow hoặc một gói biên dịch C),
chụp lỗi gửi nhóm rồi chuyển sang cách B, không cần gỡ gì.

### Cách B — chạy bằng Docker (dự phòng, chắc chắn chạy)

```bash
cd chatbot
docker compose -f docker-compose.rasa.yml run --rm rasa train     # lần đầu tải image khá lâu
docker compose -f docker-compose.rasa.yml up -d
```

Cách này chạy qua Rosetta nên `rasa train` chậm hơn vài lần, nhưng không phụ thuộc Python trên máy.
Nếu đổi `INTERNAL_API_KEY` trong `backend/.env` thì sửa theo trong `docker-compose.rasa.yml`.

## 6. App mobile

```bash
cd mobile
cp .env.example .env
npm install
npx expo install expo@latest && npx expo install --fix
npx expo start
```

- **iPhone Simulator** (chỉ có trên Mac): cài **Xcode** từ App Store (khoảng 15–20GB), mở Xcode một lần để cài thêm thành phần,
  rồi trong terminal Expo bấm `i`. Simulator chạy trên chính máy Mac nên `mobile/.env` giữ `http://localhost:5000/api` là được.
- **Điện thoại thật** (Expo Go): lấy IP bằng `ipconfig getifaddr en0`, sửa `mobile/.env` thành
  `EXPO_PUBLIC_API_URL=http://<IP đó>:5000/api`, rồi chạy lại `npx expo start`. Khi macOS hỏi có cho Node nhận kết nối không, chọn **Allow**.

## 7. Chạy nhanh bằng VS Code

Task **Chạy toàn bộ hệ thống** (Terminal → Run Task) đã dùng đường dẫn macOS (`.venv/bin/rasa`) cho cách A.
Nếu dùng cách B thì chạy riêng task Backend API và Web, còn Rasa bật bằng `docker compose` như trên.

## Lỗi thường gặp trên Mac

| Lỗi | Cách xử lý |
|---|---|
| `EADDRINUSE ... 5000` | Chưa tắt AirPlay Receiver (mục 2) |
| `P1001 Can't reach database` | Container SQL Server chưa chạy xong: `docker ps`, `docker logs library-huit-sql` |
| Container SQL Server tự tắt ngay | Chưa bật Rosetta trong Docker Desktop (mục 3) |
| `command not found: python3.10` | Chạy lại `brew install python@3.10`, mở terminal mới |
| `command not found: rasa` | Quên `source .venv/bin/activate` |
| Chatbot trả lời "Trợ lý đang tạm ngưng" | Rasa chưa chạy ở cổng 5005, hoặc action server 5055 chưa bật |
