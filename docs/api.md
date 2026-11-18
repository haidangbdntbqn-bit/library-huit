# Danh sách API

Tất cả API có tiền tố `http://localhost:5000/api`. API cần đăng nhập gửi header `Authorization: Bearer <token>`.
Quyền: **Công khai** (không cần đăng nhập), **BĐ** (bạn đọc), **TT** (thủ thư hoặc quản trị), **QT** (chỉ quản trị), **Khóa nội bộ** (header `x-internal-key`, chỉ Rasa action server dùng).

Bảng này khớp với bảng danh sách API ở mục 3.5 của báo cáo.

| Phương thức, đường dẫn | Quyền | Chức năng |
|---|---|---|
| POST /auth/login, /auth/register | Công khai | Đăng nhập, đăng ký bạn đọc |
| GET, PATCH /auth/me; POST /auth/change-password | Đã đăng nhập | Thông tin cá nhân, đổi mật khẩu |
| GET /cards/me | BĐ | Xem thẻ thư viện (thẻ sinh viên) |
| GET /cards; PATCH /cards/:id/lock \| unlock | TT | Khóa, mở khóa thẻ |
| GET /books, /books/:id | Công khai | Tra cứu sách, chi tiết và số bản còn |
| GET /books?sort=popular; GET /books/by-barcode/:code | Công khai | Sách được mượn nhiều; tra sách theo mã vạch (quét bằng ứng dụng) |
| POST /books; PATCH /books/:id; GET /books/:id/copies | TT | Quản lý đầu sách, bản sách |
| GET /copies/barcode/:barcode; PATCH /copies/:id | TT | Tra mã vạch, cập nhật bản sách |
| GET, POST /imports; GET /imports/:id | TT | Phiếu nhập (sinh mã vạch) |
| GET, POST /liquidations; GET /liquidations/:id | TT | Phiếu thanh lý |
| GET /borrow-requests/me; POST /borrow-requests (bookId, loanType); PATCH /borrow-requests/:id/cancel | BĐ | Đặt mượn trực tuyến |
| GET /borrow-requests; GET /borrow-requests/pickup?code=; PATCH /borrow-requests/:id/ready \| reject | TT | Soạn sách (giữ bản), dữ liệu điền sẵn phiếu mượn, từ chối |
| GET /loans/me; POST /loans/items/:itemId/renew | BĐ | Lịch sử mượn, gia hạn |
| GET /loans, /loans/:id; POST /loans | TT | Danh sách, lập phiếu mượn |
| GET /returns/lookup; GET /returns/reader?code=; POST /returns | TT | Nhận trả sách theo mã vạch hoặc MSSV, tính phạt |
| GET /readers, /readers/:id, /readers/lookup; POST /readers; PATCH /readers/:id | TT | Quản lý đọc giả |
| GET /violations/me | BĐ | Vi phạm của tôi |
| GET, POST /violations; PATCH /violations/:id/pay \| waive | TT | Xử lý vi phạm |
| GET /rooms, /rooms/available | Công khai | Tình trạng phòng, tìm phòng trống |
| POST /rooms; PATCH /rooms/:id | TT | Quản lý phòng |
| GET /bookings/me; POST /bookings; PATCH /bookings/:id/cancel-mine | BĐ | Mượn phòng, lịch sử mượn phòng |
| GET /bookings; PATCH /bookings/:id/approve \| reject \| checkin \| cancel | TT | Duyệt, từ chối, nhận phòng, hủy lượt mượn phòng |
| GET /bookings/:id/checklist; PATCH /bookings/:id/checkout | TT | Danh mục kiểm tra phòng; trả phòng kèm đánh giá tình trạng, lập vi phạm hư hỏng / mất đồ |
| GET /materials?category=; POST, PATCH /materials | Công khai / TT | Nhà sách: giáo trình, sách tham khảo, tài liệu bài giảng |
| GET /materials/:id/suggestions | Công khai | Gợi ý sách: liên quan, thường mua cùng, bán chạy cùng khoa, dành cho ngành của bạn |
| GET /orders/me; POST /orders; PATCH /orders/:id/cancel-mine | BĐ | Mua tài liệu |
| GET /orders; PATCH /orders/:id/pay \| complete \| cancel | TT | Xử lý đơn hàng |
| GET /reports/overview \| service-usage \| books-by-major \| annual-updates \| revenue \| top-books \| by-faculty | TT | Báo cáo thống kê, thống kê và hoa hồng theo khoa |
| GET /notifications/me | BĐ | Nhắc nhở: sắp đến hạn, quá hạn, sách chờ nhận, nợ phạt, lịch phòng |
| POST /notifications/send-reminders; GET /notifications/logs | TT | Gửi email nhắc hạn trả ngay, xem lịch sử gửi |
| GET /faculties; POST, PATCH /faculties | Công khai / QT | Khoa và tỉ lệ hoa hồng |
| GET /rooms/shifts | Công khai | Danh sách ca mượn phòng |
| GET, POST /staff; PATCH /staff/:id | QT | Quản lý nhân viên |
| GET, POST /users; PATCH /users/:id, /users/:id/reset-password | QT | Quản lý tài khoản |
| GET /audit-logs | QT | Nhật ký thao tác (lọc theo người, thời gian, từ khóa) |
| GET /settings; PUT /settings | Công khai / QT | Quy định nghiệp vụ |
| GET /majors; POST, PATCH /majors | Công khai / TT | Danh mục ngành |
| POST /chatbot/message; GET /chatbot/history | Công khai / Đã đăng nhập | Gửi câu hỏi tới chatbot, lịch sử chat |
| GET /internal/users/:id/loans \| bookings \| profile | Khóa nội bộ | Dữ liệu cho Rasa action server (sách đang mượn, lịch phòng, ngành và khoa của người hỏi) |

Thao tác ghi dữ liệu (POST, PATCH, PUT, DELETE) của thủ thư, quản trị viên và mọi lần đăng nhập được ghi vào bảng AuditLog (xem tại `GET /audit-logs`).

Lỗi trả về dạng `{ "message": "Mô tả lỗi tiếng Việt" }` với mã HTTP 400 / 401 / 403 / 404 / 409 / 500.
