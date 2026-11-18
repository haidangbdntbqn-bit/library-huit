# Đối chiếu chức năng với yêu cầu đề tài


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

