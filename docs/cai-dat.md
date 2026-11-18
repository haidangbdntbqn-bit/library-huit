# Hướng dẫn cài đặt chi tiết

Tài liệu này dành cho người muốn chạy toàn bộ hệ thống (backend, web, app, chatbot) trên máy cá nhân. Xem tổng quan ở [README](../README.md).

## 1. Cài đặt công cụ (một lần)

- Node.js 22 LTS (Node 20 đã hết hỗ trợ từ 30/04/2026), Git, VS Code (mở thư mục gốc, cài các extension được gợi ý)
- SQL Server 2019/2022 (Developer hoặc Express) + SSMS; hoặc Docker rồi chạy `docker compose up -d`
- Python **3.10** (Rasa 3.6 không chạy trên 3.11+)
- Điện thoại cài app **Expo Go**

**Dùng macOS (chip Apple)?** Xem [cai-dat-macos.md](cai-dat-macos.md) — có vài bước khác Windows (SQL Server chạy bằng Docker, tắt AirPlay Receiver để giải phóng cổng 5000, cách chạy Rasa).

## 2. Kết nối SQL Server

Prisma kết nối qua TCP bằng tài khoản SQL (không dùng Windows Authentication):

1. SSMS → chuột phải server → Properties → Security → chọn **SQL Server and Windows Authentication mode**.
2. Security → Logins → `sa` → đặt mật khẩu, tab Status chọn **Enabled**.
3. SQL Server Configuration Manager → SQL Server Network Configuration → Protocols → bật **TCP/IP**; tab IP Addresses, mục IPAll đặt **TCP Port = 1433**.
4. Khởi động lại dịch vụ SQL Server.
5. Sửa `DATABASE_URL` trong `backend/.env` cho đúng mật khẩu.

Lỗi thường gặp: `P1001 Can't reach database` → chưa bật TCP/IP hoặc sai cổng; `Login failed for user 'sa'` → chưa bật chế độ SQL Authentication hoặc sai mật khẩu.

## 3. Chạy backend + tạo CSDL

Các thư mục `backend`, `web`, `mobile`, `chatbot` đều có file `.env.example`. Copy thành `.env` rồi sửa cho đúng máy mình (Windows: `copy .env.example .env`, macOS/Linux: `cp .env.example .env`). Khóa `INTERNAL_API_KEY` ở `backend/.env` và `chatbot/.env` phải giống nhau.

```bash
cd backend
npm install
npm run db:migrate     # tạo database LibraryHUIT và các bảng; đặt tên migration: init
npm run db:seed        # dữ liệu mẫu
npm run dev            # http://localhost:5000/api/health
```

Tài khoản mẫu:

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Quản trị | admin | Admin@123 |
| Thủ thư | thuthu | Thuthu@123 |
| Bạn đọc (đã có thẻ, đang mượn 1 cuốn) | sinhvien | Sinhvien@123 |
| Bạn đọc (có sách quá hạn khi dùng dữ liệu demo) | sinhvien2 | Sinhvien@123 |

Mã vạch sách mẫu có dạng `GT-CNTT-002-001` (mã sách + số thứ tự bản). Bản số 005 của mỗi đầu sách chỉ đọc tại chỗ.

### Dữ liệu demo lớn (giống thật)

Để trang báo cáo thống kê, chatbot và các danh sách có nhiều dữ liệu, chạy thêm:

```bash
cd backend
npm run db:seed:demo   # XÓA toàn bộ dữ liệu hiện có rồi nạp bộ dữ liệu demo (khoảng 1 phút)
```

Bộ dữ liệu mô phỏng khoảng 14 tháng hoạt động gần nhất (tính đến ngày chạy lệnh): 12 ngành, ~470 bạn đọc (sinh viên khóa 12–17, giảng viên, cán bộ; thẻ còn hạn, hết hạn, bị khóa), 8 khoa, 8 nhân viên, ~150 đầu sách với ~1.000 bản sách nhập qua các năm 2019–2026, ~5.500 phiếu mượn (về nhà, tại chỗ; có trả trễ, làm hỏng, làm mất), ~1.200 vi phạm, ~6.900 lượt mượn phòng theo 4 ca, nhà sách 162 đầu sách/tài liệu bán và ~680 đơn hàng, yêu cầu mượn trực tuyến và nhật ký chatbot. Số lượt mượn thay đổi theo mùa: cao vào mùa thi, thấp vào kỳ nghỉ hè và Tết; thư viện nghỉ Chủ nhật và ngày lễ. Dữ liệu sinh theo hạt giống cố định nên mọi thành viên chạy ra giống nhau. Tên người, tác giả, ISBN, số điện thoại đều là giả lập.

| Tài khoản | Mật khẩu | Ghi chú |
|---|---|---|
| admin, giamdoc | Admin@123 / Thuthu@123 | Quản trị viên |
| thuthu, tt.hoa, tt.phuc, tt.ngan, tt.khoa, tt.yen | Thuthu@123 | Thủ thư |
| sinhvien | Sinhvien@123 | Bạn đọc demo: có lịch sử mượn, 1 phiếu đang mượn 2 cuốn còn 2 ngày đến hạn (gia hạn được), 1 yêu cầu mượn Sẵn sàng nhận, 1 lịch phòng ngày mai, 1 đơn hàng chờ thanh toán |
| sinhvien2 | Sinhvien@123 | Có 1 cuốn quá hạn: thấy nhắc nhở quá hạn, bị chặn mượn đến khi trả |
| MSSV bất kỳ (xem ở /admin/readers), gv0001… | Docgia@123 | Các bạn đọc khác |

Muốn quay về dữ liệu mẫu nhỏ: `npm run db:reset`.

## 4. Chạy web

```bash
cd web
npm install
npm run dev            # http://localhost:5173  (trang quản trị: /admin)
```

## 5. Chạy chatbot Rasa

```bash
cd chatbot
py -3.10 -m venv .venv            # macOS/Linux: python3.10 -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
rasa train                        # huấn luyện mô hình (vài phút)
rasa run --port 5005              # terminal 1
rasa run actions                  # terminal 2 (cùng venv)
```

Thử nhanh không cần web: `rasa shell`. Khi thêm câu hỏi mẫu vào `data/nlu.yml` phải `rasa train` lại.
`INTERNAL_API_KEY` trong `chatbot/.env` phải trùng với `backend/.env`.

## 6. Chạy app mobile

```bash
cd mobile
npm install
npx expo install expo@latest      # nâng Expo SDK cho khớp app Expo Go mới nhất trên điện thoại
npx expo install --fix            # đồng bộ phiên bản các thư viện đi kèm
npx expo start                    # quét QR bằng Expo Go
```

Điện thoại không hiểu `localhost`: sửa `mobile/.env` thành IP LAN của máy chạy backend
(Windows: `ipconfig` → IPv4 Address), ví dụ `EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api`.
Điện thoại và máy tính phải chung Wi-Fi; nếu vẫn không kết nối được, cho phép Node.js qua Windows Firewall.

Trong VS Code có sẵn task **Chạy toàn bộ hệ thống** (Terminal → Run Task) để bật backend, web và Rasa cùng lúc.

## 7. Quy định nghiệp vụ

Số ngày mượn, số lần gia hạn, tiền phạt, giờ mở cửa... nằm trong bảng `Setting`, sửa tại **/admin/settings**.
Giá trị mặc định và dữ liệu mẫu là số giả để chạy thử; cần thay bằng số liệu khảo sát thực tế tại thư viện trường
trước khi demo và đưa vào báo cáo.

