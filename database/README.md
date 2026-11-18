# Cơ sở dữ liệu (SQL Server)

Nguồn gốc duy nhất của cấu trúc CSDL là file `backend/prisma/schema.prisma`.
Prisma sinh bảng, khóa chính, khóa ngoại, ràng buộc UNIQUE và chỉ mục trên SQL Server.

## Tạo CSDL

```bash
cd backend
npm run db:migrate      # tạo database LibraryHUIT + toàn bộ bảng (lần đầu đặt tên migration, ví dụ: init)
npm run db:seed         # thêm dữ liệu mẫu
```

Prisma tự tạo database nếu tài khoản SQL có quyền `CREATE DATABASE` (tài khoản `sa` có sẵn quyền này).

## Xuất script SQL cho báo cáo

```bash
cd backend
npm run db:sql          # sinh file database/schema.sql (CREATE TABLE ... cho SQL Server)
```

File `schema.sql` có thể chạy trực tiếp trong SSMS / Azure Data Studio, hoặc chèn vào phụ lục báo cáo.
Sơ đồ quan hệ (ERD) ở `docs/erd.md`.

## Danh sách bảng (23 bảng)

| Bảng | Ý nghĩa |
|---|---|
| Faculty | Khoa và tỉ lệ hoa hồng bán sách, tài liệu |
| Major | Ngành học (thuộc khoa) |
| User | Tài khoản đăng nhập (bạn đọc, thủ thư, quản trị) |
| Reader | Hồ sơ đọc giả: MSSV, ngành, lớp, tình trạng, hạn mức mượn |
| LibraryCard | Thẻ thư viện (thẻ sinh viên): hạn 6 năm, khóa / mở khóa |
| Staff | Nhân viên thư viện |
| Book | Đầu sách: giáo trình, tài liệu tham khảo |
| BookCopy | Từng bản sách có mã vạch, trạng thái, cờ đọc tại chỗ |
| BookImport | Phiếu nhập sách |
| Liquidation | Phiếu thanh lý |
| BorrowRequest | Yêu cầu mượn trực tuyến |
| Loan / LoanItem | Phiếu mượn và chi tiết phiếu (hạn trả, gia hạn, ngày trả, tiền phạt) |
| Violation | Vi phạm: trả trễ, làm hỏng, làm mất (sách hoặc đồ đạc trong phòng) |
| Room / RoomBooking | Phòng đọc, phòng học nhóm; lượt mượn phòng theo ca kèm kết quả kiểm tra khi trả phòng |
| Material | Sách, giáo trình, tài liệu bài giảng bán tại nhà sách thư viện |
| Order / OrderItem | Đơn mua tài liệu |
| Setting | Quy định nghiệp vụ (số ngày mượn, tiền phạt, giờ mở cửa...) |
| ChatLog | Lịch sử hội thoại chatbot |
| AuditLog | Nhật ký thao tác của thủ thư, quản trị viên |
| NotificationLog | Nhật ký gửi email nhắc hạn trả (chống gửi trùng trong ngày) |
