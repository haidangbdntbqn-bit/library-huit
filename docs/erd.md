# Sơ đồ quan hệ thực thể (ERD)

CSDL gồm **23 bảng**, sinh tự động từ `backend/prisma/schema.prisma`. Mở file này trong VS Code (extension Markdown Mermaid) hoặc dán khối dưới vào https://mermaid.live để xuất ảnh.

| Bảng | Ý nghĩa |
|---|---|
| Faculty | Khoa |
| Major | Ngành |
| Setting | Quy định |
| User | Tài khoản |
| Reader | Bạn đọc |
| LibraryCard | Thẻ thư viện |
| Staff | Nhân viên |
| Book | Đầu sách |
| BookCopy | Bản sách |
| BookImport | Phiếu nhập |
| Liquidation | Phiếu thanh lý |
| BorrowRequest | Yêu cầu mượn |
| Loan | Phiếu mượn |
| LoanItem | Chi tiết phiếu mượn |
| Violation | Vi phạm |
| Room | Phòng |
| RoomBooking | Lượt mượn phòng |
| Material | Tài liệu bán |
| Order | Đơn hàng |
| OrderItem | Chi tiết đơn hàng |
| ChatLog | Nhật ký chat |
| AuditLog | Nhật ký thao tác |
| NotificationLog | Nhật ký gửi thông báo |

```mermaid
erDiagram
  Faculty |o--o{ Major : "faculty"
  User ||--o| Reader : "user"
  Major |o--o{ Reader : "major"
  Reader ||--o| LibraryCard : "reader"
  User ||--o| Staff : "user"
  Major |o--o{ Book : "major"
  Book ||--o{ BookCopy : "book"
  BookImport |o--o{ BookCopy : "import"
  Liquidation |o--o{ BookCopy : "liquidation"
  Staff ||--o{ BookImport : "staff"
  Staff ||--o{ Liquidation : "staff"
  Reader ||--o{ BorrowRequest : "reader"
  Book ||--o{ BorrowRequest : "book"
  BookCopy |o--o{ BorrowRequest : "copy"
  Reader ||--o{ Loan : "reader"
  Staff |o--o{ Loan : "staff"
  Loan ||--o{ LoanItem : "loan"
  BookCopy ||--o{ LoanItem : "copy"
  Reader ||--o{ Violation : "reader"
  LoanItem |o--o{ Violation : "loanItem"
  RoomBooking |o--o{ Violation : "booking"
  Room ||--o{ RoomBooking : "room"
  Reader ||--o{ RoomBooking : "reader"
  Major |o--o{ Material : "major"
  Reader ||--o{ Order : "reader"
  Order ||--o{ OrderItem : "order"
  Material ||--o{ OrderItem : "material"
  User |o--o{ ChatLog : "user"

  Faculty {
    int id PK
    string code UK
    string name
    decimal commissionRate
  }
  Major {
    int id PK
    string code UK
    string name
    int facultyId FK
  }
  Setting {
    string key PK
    string value
  }
  User {
    int id PK
    string username UK
    string passwordHash
    string fullName
    string email
    string phone
    string role
    bool isActive
    datetime createdAt
    datetime updatedAt
  }
  Reader {
    int id PK
    int userId UK,FK
    string studentCode UK
    string readerType
    int majorId FK
    string className
    string status
    int maxBooks
    datetime createdAt
  }
  LibraryCard {
    int id PK
    int readerId UK,FK
    string cardNumber
    string status
    datetime requestedAt
    datetime issuedAt
    datetime expiresAt
    string note
  }
  Staff {
    int id PK
    int userId UK,FK
    string staffCode UK
    string position
    datetime hiredAt
  }
  Book {
    int id PK
    string code UK
    string title
    string author
    string publisher
    int publishYear
    string isbn
    string docType
    int majorId FK
    string shelf
    string description
    string coverUrl
    datetime createdAt
  }
  BookCopy {
    int id PK
    string barcode UK
    int bookId FK
    string status
    bool onsiteOnly
    string condition
    int importId FK
    int liquidationId FK
    datetime createdAt
  }
  BookImport {
    int id PK
    string code UK
    int staffId FK
    string supplier
    decimal totalCost
    string note
    datetime importedAt
  }
  Liquidation {
    int id PK
    string code UK
    int staffId FK
    string reason
    datetime createdAt
  }
  BorrowRequest {
    int id PK
    int readerId FK
    int bookId FK
    string loanType
    int copyId FK
    string status
    string note
    datetime pickupBefore
    datetime createdAt
    datetime handledAt
  }
  Loan {
    int id PK
    string code UK
    int readerId FK
    int staffId FK
    string loanType
    string status
    string note
    datetime borrowedAt
  }
  LoanItem {
    int id PK
    int loanId FK
    int copyId FK
    datetime dueAt
    int renewCount
    datetime returnedAt
    string returnCondition
    decimal fine
  }
  Violation {
    int id PK
    int readerId FK
    int loanItemId FK
    int bookingId FK
    string type
    string description
    decimal fineAmount
    string status
    datetime createdAt
    datetime resolvedAt
  }
  Room {
    int id PK
    string code UK
    string name
    string roomType
    int capacity
    string floor
    string equipment
    string status
  }
  RoomBooking {
    int id PK
    string code UK
    int roomId FK
    int readerId FK
    datetime startTime
    datetime endTime
    int people
    string purpose
    string status
    string note
    datetime createdAt
    datetime checkedInAt
    datetime checkedOutAt
    string roomCondition
    string inspection
    decimal damageFee
    string inspectedBy
  }
  Material {
    int id PK
    string code UK
    string title
    string lecturer
    int majorId FK
    string category
    string format
    decimal price
    int stock
    string description
    bool isActive
    datetime createdAt
  }
  Order {
    int id PK
    string code UK
    int readerId FK
    decimal totalAmount
    string paymentMethod
    string status
    datetime createdAt
    datetime paidAt
  }
  OrderItem {
    int id PK
    int orderId FK
    int materialId FK
    int quantity
    decimal unitPrice
  }
  ChatLog {
    int id PK
    int userId FK
    string sessionId
    string message
    string reply
    datetime createdAt
  }
  AuditLog {
    int id PK
    int userId
    string username
    string role
    string action
    string method
    string path
    int status
    string detail
    string ip
    datetime createdAt
  }
  NotificationLog {
    int id PK
    int readerId
    string kind
    string refKey
    string channel
    string toAddress
    string subject
    bool sent
    datetime createdAt
  }
```
