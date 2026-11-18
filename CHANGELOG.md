# Lịch sử thay đổi

Các phiên bản được phát triển lần lượt theo góp ý trong quá trình làm khóa luận.

## Phiên bản 2: cập nhật theo góp ý của giảng viên hướng dẫn

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

## Phiên bản 3

- **Nhà sách có gợi ý như trang mua sắm:** bấm vào một sách / tài liệu để xem chi tiết và 4 dải gợi ý: *liên quan* (cùng môn học, tên gần giống: giáo trình ↔ bài giảng ↔ sách tham khảo, hệ số Jaccard trên tên), *thường được mua cùng* (theo các đơn hàng chứa tài liệu đó), *bán chạy cùng khoa*, *dành cho ngành của bạn*. API `GET /materials/:id/suggestions`.
- **Chatbot thông minh hơn:** hiểu câu gõ không dấu (thêm câu mẫu không dấu, so khớp bỏ dấu), tìm sách gần đúng khi gõ sai chính tả; intent mới `ask_recommend` gợi ý sách theo chủ đề / ngành / ngành của người hỏi (sách mượn nhiều nhất 12 tháng, `GET /books?sort=popular`); hỏi giá sách ở nhà sách (`action_search_material`); khi chưa chắc ý định, chatbot đoán theo từ khóa và hỏi lại kèm nút chọn (`action_smart_fallback`). Sau khi cập nhật chạy lại `rasa train`.

## Phiên bản 4: hoàn thiện hệ thống

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

## Phiên bản 5: kiểm tra tình trạng phòng khi trả phòng

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
