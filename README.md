# Hệ thống quản lý thư viện - Trường ĐH Công Thương TP.HCM

Khóa luận KLCN049. Gồm 4 phần chạy độc lập, cùng dùng một CSDL SQL Server:

| Thư mục | Công nghệ | Cổng |
|---|---|---|
| `backend/` | Node.js + Express + TypeScript + Prisma | 5000 |
| `web/` | React + Vite + TypeScript + Ant Design (trang bạn đọc + trang quản trị) | 5173 |
| `mobile/` | React Native + Expo (app bạn đọc) | 8081 (Metro) |
| `chatbot/` | Rasa 3.6 (Python 3.10): NLU + custom actions | 5005, 5055 |
| `database/` | Hướng dẫn tạo CSDL, xuất script SQL | 1433 |
| `docs/` | Danh sách API, ERD, sơ đồ use case | |

```
Web / App ──HTTP──> Backend API ──Prisma──> SQL Server
                        │
                        └──REST──> Rasa (5005) ──> Action server (5055) ──> Backend API
```

## 1. Cài đặt công cụ (một lần)

- Node.js 22 LTS (Node 20 đã hết hỗ trợ từ 30/04/2026), Git, VS Code (mở thư mục gốc, cài các extension được gợi ý)
- SQL Server 2019/2022 (Developer hoặc Express) + SSMS; hoặc Docker rồi chạy `docker compose up -d`
- Python **3.10** (Rasa 3.6 không chạy trên 3.11+)
- Điện thoại cài app **Expo Go**

**Dùng macOS (chip Apple)?** Xem [docs/cai-dat-macos.md](docs/cai-dat-macos.md) — có vài bước khác Windows (SQL Server chạy bằng Docker, tắt AirPlay Receiver để giải phóng cổng 5000, cách chạy Rasa).

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

## 7. Đối chiếu yêu cầu đề cương

| Yêu cầu | Web | App | Nơi xử lý |
|---|---|---|---|
| Tạo thẻ mượn (thẻ sinh viên, kích hoạt ngay khi đăng ký) | Đăng ký → Tài khoản → Thẻ thư viện | Đăng ký, tab Tài khoản | `auth`, `cards` |
| Lịch sử mượn sách, mượn phòng | Sách của tôi, Mượn phòng | Tab Sách của tôi, Mượn phòng | `loans`, `bookings` |
| Gia hạn mượn sách | Sách của tôi | Tab Sách của tôi | `loans.service.renewItem` |
| Mua tài liệu bài giảng, sách, giáo trình | Nhà sách | Màn Nhà sách | `materials`, `orders` |
| Chatbot tư vấn mượn sách, mượn phòng | Nút Hỏi trợ lý | Tab Trợ lý | `chatbot/`, `chatbot.routes` |
| Tìm và mượn sách | Tra cứu → Đặt mượn | Tab Tra cứu | `books`, `borrowRequests` |
| QL tài khoản người dùng | /admin/users | | `users` |
| QL phòng đọc, phòng nhóm (mượn, trả, tình trạng) | /admin/rooms | | `rooms`, `bookings` |
| QL sách, giáo trình, TLTK (nhập, thanh lý) | /admin/books, imports, liquidations | | `books`, `imports`, `liquidations` |
| QL đọc giả (tình trạng, vi phạm) | /admin/readers, violations, cards | | `readers`, `violations` |
| QL mượn sách (phiếu, về nhà, tại chỗ) | /admin/loans/new, loans, borrow-requests | | `loans.service.createLoan` |
| QL trả sách (đúng hạn, trễ hạn) | /admin/returns | | `loans.service.returnItems` |
| QL nhân viên | /admin/staff | | `staff` |
| Báo cáo thống kê (mật độ dịch vụ, theo ngành, cập nhật hằng năm, doanh thu) | /admin/reports | | `reports` |

## 8. Cập nhật theo góp ý GVHD (phiên bản 2)

| Góp ý | Thay đổi |
|---|---|
| Giao diện theo phương án F | Web và app dùng màu xanh biển `#0B4DA2` trên nền trắng, font IBM Plex Sans |
| Nhắc nhở hạn trả | Chuông thông báo trên web, dải nhắc ở Trang chủ / Sách của tôi (web, app): sắp đến hạn (trước 3 ngày, cấu hình `REMIND_DAYS`), quá hạn, sách đã soạn chờ nhận, tiền phạt, lịch phòng, đơn chờ nhận. API `GET /notifications/me` |
| Bán nhiều sách | Nhà sách có 3 loại: giáo trình, sách tham khảo, tài liệu bài giảng (cột `Material.category`) |
| Hoa hồng theo khoa | Bảng `Faculty` (tỉ lệ hoa hồng, mặc định 5%), ngành thuộc khoa; báo cáo doanh thu và hoa hồng theo khoa; sửa tỉ lệ ở Cài đặt → Khoa và hoa hồng |
| Phòng 7h–17h, 4 ca | Chỉ đặt đúng ca 7–9, 9–11, 13–15, 15–17; lưới ca: ô xanh lá là đã có người đặt, xanh dương là lượt của mình |
| Thẻ 6 năm, bỏ duyệt thẻ | Thẻ sinh viên là thẻ thư viện (số thẻ = MSSV), kích hoạt ngay khi đăng ký, hết hạn 6 năm sau năm nhập học, không gia hạn; thủ thư chỉ khóa/mở khóa |
| Lập phiếu từ yêu cầu tự điền | Khi soạn sách, hệ thống giữ một bản (trạng thái `RESERVED`); nút Lập phiếu mượn điền sẵn bạn đọc, mã vạch, hình thức, hạn trả. Ô sách cũng nhận mã đầu sách và tự chọn bản còn |
| Trả sách theo MSSV | Trang Trả sách có thêm chế độ "Theo MSSV bạn đọc": liệt kê sách đang mượn để chọn trả (vẫn giữ quét mã vạch) |
| Thống kê theo khoa | Báo cáo: khoa mượn sách, phòng nhóm, phòng đọc nhiều nhất |
| Gia hạn 3 ngày | `RENEW_DAYS = 3` |

**Nâng cấp CSDL từ phiên bản trước:** dừng backend, rồi chạy
```bash
cd backend
npx prisma migrate dev --name v2-gop-y-gvhd   # thêm bảng Faculty và các cột mới
npm run db:seed:demo                         # nạp lại dữ liệu demo theo cấu trúc mới
```
Chatbot có câu trả lời mới: trong thư mục `chatbot` chạy lại `rasa train` rồi khởi động lại Rasa và action server.

### Bổ sung (phiên bản 3)

- **Nhà sách có gợi ý như trang mua sắm:** bấm vào một sách / tài liệu để xem chi tiết và 4 dải gợi ý: *liên quan* (cùng môn học, tên gần giống: giáo trình ↔ bài giảng ↔ sách tham khảo, hệ số Jaccard trên tên), *thường được mua cùng* (theo các đơn hàng chứa tài liệu đó), *bán chạy cùng khoa*, *dành cho ngành của bạn*. API `GET /materials/:id/suggestions`.
- **Chatbot thông minh hơn:** hiểu câu gõ không dấu (thêm câu mẫu không dấu, so khớp bỏ dấu), tìm sách gần đúng khi gõ sai chính tả; intent mới `ask_recommend` gợi ý sách theo chủ đề / ngành / ngành của người hỏi (sách mượn nhiều nhất 12 tháng, `GET /books?sort=popular`); hỏi giá sách ở nhà sách (`action_search_material`); khi chưa chắc ý định, chatbot đoán theo từ khóa và hỏi lại kèm nút chọn (`action_smart_fallback`). Sau khi cập nhật chạy lại `rasa train`.

### Bổ sung (phiên bản 4) – hoàn thiện hệ thống

| Tính năng | Ở đâu | Ghi chú |
|---|---|---|
| **Kiểm thử tự động** 33 ca cho quy tắc nghiệp vụ (tiền phạt, gia hạn, điều kiện mượn, hạn thẻ 6 năm, ca phòng, sức chứa, hoa hồng) | `backend/src/modules/rules/` | `cd backend && npm test` (Vitest). Quy tắc tách thành hàm thuần trong `rules.ts`, service gọi lại |
| **Email nhắc hạn trả** tự động mỗi sáng (7h) + nút gửi ngay | Trang *Phiếu mượn* → *Gửi email nhắc hạn trả* | Cấu hình `SMTP_*` trong `backend/.env` để gửi thật (Gmail dùng mật khẩu ứng dụng); để trống thì chỉ ghi log. Mỗi bạn đọc tối đa 1 email/ngày (bảng `NotificationLog`) |
| **Nhật ký thao tác** (audit log) | *Hệ thống → Nhật ký thao tác* (quản trị viên) | Ghi mọi thao tác thay đổi dữ liệu của thủ thư, quản trị và các lần đăng nhập (bảng `AuditLog`) |
| **Mã vạch Code 128 thật** | Thẻ thư viện (Tài khoản), *Kho sách → bản sách → In nhãn mã vạch* | Quét được bằng máy quét và camera |
| **Quét mã bằng webcam** | Lập phiếu mượn, Trả sách, tìm bạn đọc | Dùng Chrome/Edge (BarcodeDetector) |
| **Quét mã bằng điện thoại** | App → tab Tra cứu → biểu tượng mã vạch | Quét nhãn sách → mở chi tiết sách; API `GET /books/by-barcode/:code` |
| **Xuất Excel báo cáo** | *Báo cáo thống kê → Xuất Excel* | 6 trang tính: mật độ dịch vụ, theo khoa và hoa hồng, sách mượn nhiều, tài liệu theo ngành, cập nhật hằng năm, doanh thu |

Nâng cấp từ phiên bản trước:
```bash
cd backend && npm install && npx prisma migrate dev --name v4-audit-email && npm test
cd ../web && npm install
cd ../mobile && npx expo install expo-camera
```

## 9. Quy định nghiệp vụ

Số ngày mượn, số lần gia hạn, tiền phạt, giờ mở cửa... nằm trong bảng `Setting`, sửa tại **/admin/settings**.
Giá trị mặc định và dữ liệu mẫu là số giả để chạy thử; cần thay bằng số liệu khảo sát thực tế tại thư viện trường
trước khi demo và đưa vào báo cáo.

## 10. Cấu trúc backend

```
backend/src
├── config/        env, kết nối Prisma
├── middlewares/   xác thực JWT, phân quyền, kiểm tra dữ liệu (zod), xử lý lỗi
├── utils/         hàm dùng chung (ngày giờ, sinh mã phiếu, phân trang)
└── modules/<tên>/ mỗi chức năng một thư mục: *.routes.ts (API) + *.service.ts (nghiệp vụ)
```

Các nghiệp vụ quan trọng cần nắm kỹ khi bảo vệ: `loans/loans.service.ts` (điều kiện mượn, lập phiếu, gia hạn, trả sách,
tính phạt), `rooms/rooms.service.ts` (kiểm tra trùng lịch phòng), `store/orders.routes.ts` (trừ tồn kho trong transaction),
`chatbot/actions/actions.py` (cách chatbot lấy dữ liệu thật).

## Bổ sung (phiên bản 5): kiểm tra tình trạng phòng khi trả phòng

- Thủ thư bấm **Trả phòng** ở trang Phòng đọc, phòng học nhóm → mở bảng kiểm tra: từng thiết bị khai báo của phòng (bảng trắng, màn hình TV…) cùng các mục chung (bàn ghế, ổ điện, đèn, vệ sinh phòng), chọn *Bình thường / Hư hỏng / Bị mất*, nhập tiền phạt (gợi ý sẵn theo Cài đặt) và ghi chú; thêm được mục khác.
- Mục hư hỏng / bị mất được lập **vi phạm** cho bạn đọc đã mượn phòng (nộp phạt ở trang Vi phạm); có thể chuyển phòng sang **Bảo trì** để sửa chữa.
- Lịch mượn phòng có cột **Kiểm tra khi trả** (Bình thường / Hư hỏng, mất · số tiền), bấm vào để xem lại chi tiết; bạn đọc thấy kết quả ở cột Ghi chú (web) và trong lịch sử mượn phòng (app).
- Cài đặt thêm: *Tiền phạt gợi ý khi làm hỏng / làm mất đồ đạc trong phòng* (100.000 đ / 300.000 đ).
- Kiểm thử tự động: 37 ca (thêm 4 ca kiểm tra phòng).

```bash
cd backend
npm install
npx prisma migrate dev --name v5-kiem-tra-phong
npm test                 # 37 passed
npm run db:seed:demo     # nạp lại dữ liệu demo (có sẵn vài lượt trả phòng bị hư hỏng / mất đồ)
cd ../web && npm install
```
