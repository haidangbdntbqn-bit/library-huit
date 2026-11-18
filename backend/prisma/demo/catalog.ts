/**
 * Danh mục dùng để sinh dữ liệu demo. Tên sách là tên môn học / chủ đề phổ biến,
 * tác giả, bạn đọc, nhân viên đều là tên giả lập (không phải người thật).
 */

/** Khoa (dùng thống kê theo khoa và chia hoa hồng bán sách, tài liệu) */
export const FACULTIES = [
  { code: "K-CNTT", name: "Khoa Công nghệ thông tin", commissionRate: 5 },
  { code: "K-TCKT", name: "Khoa Tài chính – Kế toán", commissionRate: 5 },
  { code: "K-QTKD", name: "Khoa Quản trị kinh doanh", commissionRate: 5 },
  { code: "K-CNTP", name: "Khoa Công nghệ thực phẩm", commissionRate: 5 },
  { code: "K-CNSH", name: "Khoa Công nghệ sinh học", commissionRate: 5 },
  { code: "K-CNHH", name: "Khoa Công nghệ hóa học", commissionRate: 5 },
  { code: "K-DLAT", name: "Khoa Du lịch và Ẩm thực", commissionRate: 5 },
  { code: "K-NN", name: "Khoa Ngoại ngữ", commissionRate: 5 },
];

export interface MajorDef {
  faculty: string; // mã khoa
  code: string; // mã ngành trong hệ thống
  cls: string; // ký hiệu ngành trong tên lớp, ví dụ 14DHTH16
  name: string;
  shelf: string; // khu kệ
  weight: number; // tỉ lệ sinh viên
  gt: string[]; // giáo trình
  tk: string[]; // tài liệu tham khảo
}

export const MAJORS: MajorDef[] = [
  {
    faculty: "K-CNTT", code: "CNTT", cls: "TH", name: "Công nghệ thông tin", shelf: "C3", weight: 16,
    gt: ["Nhập môn lập trình", "Kỹ thuật lập trình", "Cấu trúc dữ liệu và giải thuật", "Cơ sở dữ liệu", "Hệ quản trị cơ sở dữ liệu SQL Server",
      "Lập trình hướng đối tượng", "Mạng máy tính", "Hệ điều hành", "Phân tích thiết kế hệ thống thông tin", "Công nghệ phần mềm",
      "Lập trình Web", "Lập trình ứng dụng di động", "Trí tuệ nhân tạo", "Kiến trúc máy tính", "Toán rời rạc"],
    tk: ["Học máy cơ bản", "Xử lý ngôn ngữ tự nhiên với Python", "Thiết kế giao diện người dùng", "Kiểm thử phần mềm", "Điện toán đám mây",
      "Phân tích dữ liệu với Python", "Lập trình JavaScript hiện đại", "Mẫu thiết kế hướng đối tượng", "Quản lý dự án phần mềm", "Khai phá dữ liệu",
      "Kỹ thuật lập trình ReactJS", "Xây dựng RESTful API với Node.js"],
  },
  {
    faculty: "K-CNTT", code: "ATTT", cls: "AT", name: "An toàn thông tin", shelf: "C4", weight: 5,
    gt: ["Nhập môn an toàn thông tin", "Mật mã học cơ sở", "An ninh mạng", "Bảo mật cơ sở dữ liệu", "Phân tích mã độc"],
    tk: ["Kiểm thử xâm nhập ứng dụng web", "Quản lý rủi ro an toàn thông tin", "Pháp chứng số", "An toàn hệ điều hành Linux"],
  },
  {
    faculty: "K-TCKT", code: "KT", cls: "KT", name: "Kế toán", shelf: "B2", weight: 12,
    gt: ["Nguyên lý kế toán", "Kế toán tài chính 1", "Kế toán tài chính 2", "Kế toán quản trị", "Kế toán chi phí", "Kiểm toán căn bản",
      "Hệ thống thông tin kế toán", "Thuế", "Kế toán ngân hàng thương mại"],
    tk: ["Chuẩn mực kế toán Việt Nam", "Phân tích báo cáo tài chính", "Kế toán doanh nghiệp vừa và nhỏ", "Thực hành kế toán trên phần mềm", "Kiểm soát nội bộ"],
  },
  {
    faculty: "K-QTKD", code: "QTKD", cls: "QT", name: "Quản trị kinh doanh", shelf: "B3", weight: 14,
    gt: ["Quản trị học", "Kinh tế vi mô", "Kinh tế vĩ mô", "Quản trị nguồn nhân lực", "Quản trị chiến lược", "Quản trị sản xuất và vận hành",
      "Quản trị chuỗi cung ứng", "Hành vi tổ chức", "Khởi nghiệp và đổi mới sáng tạo"],
    tk: ["Kỹ năng lãnh đạo", "Đàm phán trong kinh doanh", "Quản trị dự án", "Văn hóa doanh nghiệp", "Phương pháp nghiên cứu trong kinh doanh"],
  },
  {
    faculty: "K-QTKD", code: "MKT", cls: "MK", name: "Marketing", shelf: "B3", weight: 7,
    gt: ["Marketing căn bản", "Nghiên cứu marketing", "Hành vi người tiêu dùng", "Quản trị thương hiệu", "Marketing kỹ thuật số"],
    tk: ["Truyền thông marketing tích hợp", "Marketing nội dung", "Thương mại điện tử", "Quản trị bán hàng"],
  },
  {
    faculty: "K-TCKT", code: "TCNH", cls: "TC", name: "Tài chính – Ngân hàng", shelf: "B4", weight: 8,
    gt: ["Lý thuyết tài chính tiền tệ", "Tài chính doanh nghiệp", "Nghiệp vụ ngân hàng thương mại", "Thị trường chứng khoán", "Tài chính quốc tế", "Thẩm định dự án đầu tư"],
    tk: ["Quản trị rủi ro tài chính", "Phân tích đầu tư chứng khoán", "Fintech và ngân hàng số", "Định giá doanh nghiệp"],
  },
  {
    faculty: "K-CNTP", code: "CNTP", cls: "TP", name: "Công nghệ thực phẩm", shelf: "A1", weight: 12,
    gt: ["Hóa sinh thực phẩm", "Vi sinh vật học thực phẩm", "Hóa học thực phẩm", "Kỹ thuật thực phẩm", "Công nghệ chế biến thịt và thủy sản",
      "Công nghệ chế biến sữa", "Công nghệ lên men", "Phân tích thực phẩm", "Bao bì thực phẩm", "Đánh giá cảm quan thực phẩm"],
    tk: ["Phụ gia thực phẩm", "Công nghệ sau thu hoạch", "Phát triển sản phẩm thực phẩm", "Dinh dưỡng học", "Thực phẩm chức năng"],
  },
  {
    faculty: "K-CNTP", code: "ATTP", cls: "DB", name: "Đảm bảo chất lượng và an toàn thực phẩm", shelf: "A1", weight: 5,
    gt: ["Quản lý chất lượng thực phẩm", "Hệ thống HACCP", "Luật thực phẩm", "Độc tố học thực phẩm"],
    tk: ["ISO 22000 trong doanh nghiệp thực phẩm", "Kiểm nghiệm vi sinh thực phẩm", "Truy xuất nguồn gốc thực phẩm"],
  },
  {
    faculty: "K-CNSH", code: "CNSH", cls: "SH", name: "Công nghệ sinh học", shelf: "A3", weight: 5,
    gt: ["Sinh học tế bào", "Di truyền học", "Công nghệ gen", "Công nghệ vi sinh", "Công nghệ enzyme"],
    tk: ["Công nghệ sinh học thực vật", "Kỹ thuật nuôi cấy mô", "Tin sinh học cơ bản"],
  },
  {
    faculty: "K-CNHH", code: "CNHH", cls: "HH", name: "Công nghệ kỹ thuật hóa học", shelf: "A2", weight: 7,
    gt: ["Hóa học đại cương", "Hóa hữu cơ", "Hóa phân tích", "Hóa lý", "Quá trình và thiết bị công nghệ hóa học", "Kỹ thuật phản ứng"],
    tk: ["Hóa học xanh", "Công nghệ polymer", "Kỹ thuật xử lý nước thải", "An toàn hóa chất"],
  },
  {
    faculty: "K-DLAT", code: "DLLH", cls: "DL", name: "Quản trị dịch vụ du lịch và lữ hành", shelf: "B5", weight: 5,
    gt: ["Tổng quan du lịch", "Nghiệp vụ hướng dẫn du lịch", "Quản trị lữ hành", "Địa lý du lịch Việt Nam"],
    tk: ["Marketing du lịch", "Văn hóa ẩm thực Việt Nam", "Du lịch bền vững"],
  },
  {
    faculty: "K-NN", code: "NNA", cls: "NA", name: "Ngôn ngữ Anh", shelf: "D1", weight: 6,
    gt: ["Ngữ pháp tiếng Anh", "Ngữ âm – âm vị học", "Kỹ năng viết học thuật", "Biên dịch Anh – Việt", "Tiếng Anh thương mại"],
    tk: ["Luyện thi IELTS", "Từ vựng tiếng Anh chuyên ngành kinh tế", "Phiên dịch hội nghị"],
  },
];

// Tài liệu dùng chung (không thuộc ngành cụ thể)
export const GENERAL_GT = ["Triết học Mác – Lênin", "Kinh tế chính trị Mác – Lênin", "Chủ nghĩa xã hội khoa học", "Tư tưởng Hồ Chí Minh",
  "Lịch sử Đảng Cộng sản Việt Nam", "Pháp luật đại cương", "Toán cao cấp", "Xác suất thống kê", "Tiếng Anh 1", "Tiếng Anh 2"];
export const GENERAL_TK = ["Kỹ năng mềm cho sinh viên", "Phương pháp học tập đại học", "Tin học văn phòng", "Kỹ năng viết báo cáo khoa học"];

export const PUBLISHERS = ["NXB Giáo dục Việt Nam", "NXB Khoa học và Kỹ thuật", "NXB Đại học Quốc gia TP. HCM", "NXB Thống kê", "NXB Tài chính",
  "NXB Lao động", "NXB Chính trị quốc gia Sự thật", "NXB Công Thương", "NXB Thông tin và Truyền thông", "NXB Kinh tế TP. HCM"];

export const HO = ["Nguyễn", "Nguyễn", "Nguyễn", "Nguyễn", "Trần", "Trần", "Lê", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Trương", "Đinh", "Mai", "Lâm", "Tô", "Châu"];
export const DEM_NAM = ["Văn", "Minh", "Hoàng", "Quốc", "Gia", "Đức", "Hữu", "Thanh", "Anh", "Tuấn", "Công", "Nhật", "Bảo", "Thành", "Trọng"];
export const DEM_NU = ["Thị", "Ngọc", "Thanh", "Thu", "Kim", "Phương", "Minh", "Bảo", "Hoài", "Mỹ", "Tường", "Khánh", "Diệu", "Như", "Thảo"];
export const TEN_NAM = ["An", "Bình", "Cường", "Dũng", "Duy", "Đạt", "Hải", "Hiếu", "Hoàng", "Huy", "Khang", "Khoa", "Kiên", "Long", "Luân",
  "Minh", "Nam", "Nghĩa", "Nhân", "Phát", "Phong", "Phúc", "Quân", "Sơn", "Tài", "Thắng", "Thiện", "Thịnh", "Tiến", "Toàn", "Trí",
  "Trung", "Tuấn", "Vinh", "Vũ", "Khôi", "Lộc", "Tâm", "Hưng", "Nhật"];
export const TEN_NU = ["Anh", "Châu", "Chi", "Diễm", "Dung", "Duyên", "Giang", "Hà", "Hân", "Hằng", "Hạnh", "Hiền", "Hoa", "Huyền", "Hương",
  "Lan", "Linh", "Loan", "Mai", "My", "Ngân", "Ngọc", "Nhi", "Nhung", "Oanh", "Phương", "Quyên", "Tâm", "Thảo", "Thư", "Trang",
  "Trâm", "Trinh", "Tú", "Uyên", "Vy", "Yến", "Xuân", "Lam", "Khánh"];

export const STAFF_DEFS = [
  { username: "admin", staffCode: "NV000", fullName: "Quản trị hệ thống", position: "Quản trị hệ thống", role: "ADMIN" },
  { username: "thuthu", staffCode: "NV001", fullName: "Trần Thị Thủ Thư", position: "Thủ thư quầy lưu hành", role: "LIBRARIAN" },
  { username: "giamdoc", staffCode: "NV002", fullName: "Phạm Thị Minh Tâm", position: "Giám đốc Trung tâm", role: "ADMIN" },
  { username: "tt.hoa", staffCode: "NV003", fullName: "Lê Thị Hoa", position: "Thủ thư quầy lưu hành", role: "LIBRARIAN" },
  { username: "tt.phuc", staffCode: "NV004", fullName: "Nguyễn Hoàng Phúc", position: "Thủ thư phòng đọc, phòng nhóm", role: "LIBRARIAN" },
  { username: "tt.ngan", staffCode: "NV005", fullName: "Võ Thanh Ngân", position: "Nhân viên bổ sung – biên mục", role: "LIBRARIAN" },
  { username: "tt.khoa", staffCode: "NV006", fullName: "Đặng Minh Khoa", position: "Nhân viên thông tin – thư viện số", role: "LIBRARIAN" },
  { username: "tt.yen", staffCode: "NV007", fullName: "Huỳnh Ngọc Yến", position: "Nhân viên phát hành tài liệu", role: "LIBRARIAN" },
];

export const ROOM_DEFS = [
  { code: "P301", name: "Phòng học nhóm P.301", roomType: "GROUP", capacity: 6, floor: "Tầng 3", equipment: "Bảng trắng, màn hình TV" },
  { code: "P302", name: "Phòng học nhóm P.302", roomType: "GROUP", capacity: 6, floor: "Tầng 3", equipment: "Bảng trắng, màn hình TV" },
  { code: "P303", name: "Phòng học nhóm P.303", roomType: "GROUP", capacity: 7, floor: "Tầng 3", equipment: "Bảng trắng" },
  { code: "P304", name: "Phòng học nhóm P.304", roomType: "GROUP", capacity: 7, floor: "Tầng 3", equipment: "Bảng trắng, máy chiếu" },
  { code: "P305", name: "Phòng học nhóm P.305", roomType: "GROUP", capacity: 5, floor: "Tầng 3", equipment: "Bảng trắng" },
  { code: "P306", name: "Phòng học nhóm P.306", roomType: "GROUP", capacity: 8, floor: "Tầng 3", equipment: "Bảng trắng, máy chiếu, loa" },
  { code: "P401", name: "Phòng thực hành thuyết trình P.401", roomType: "GROUP", capacity: 10, floor: "Tầng 4", equipment: "Máy chiếu, micro, bục thuyết trình" },
  { code: "PD2", name: "Phòng đọc tầng 2", roomType: "READING", capacity: 120, floor: "Tầng 2", equipment: "Wifi, ổ cắm, máy tính tra cứu" },
  { code: "PDGV", name: "Phòng đọc giảng viên", roomType: "READING", capacity: 20, floor: "Tầng 2", equipment: "Wifi, ổ cắm, máy tính" },
];

export const PURPOSES = ["Thảo luận bài tập nhóm", "Chuẩn bị thuyết trình", "Ôn thi cuối kỳ", "Họp nhóm đồ án", "Làm báo cáo thực tập",
  "Tập dượt bảo vệ khóa luận", "Học nhóm môn chuyên ngành", "Họp câu lạc bộ học thuật"];

export const CHAT_SAMPLES: Array<[string, string]> = [
  ["thư viện mở cửa mấy giờ", "Thư viện mở cửa từ 7h đến 20h, từ thứ Hai đến thứ Bảy."],
  ["trả sách trễ bị phạt bao nhiêu", "Trả trễ bị phạt 2.000 đ mỗi ngày cho mỗi cuốn. Bạn nhớ gia hạn trước hạn trả nhé."],
  ["tìm sách cơ sở dữ liệu", "Mình tìm thấy: Cơ sở dữ liệu (còn 3 bản, kệ C3-04)..."],
  ["còn phòng nhóm cho 5 người chiều nay không", "Chiều nay còn trống: Phòng học nhóm P.302 (6 chỗ), P.305 (5 chỗ)."],
  ["sách mình đang mượn khi nào hết hạn", "Bạn đang mượn 2 cuốn, cuốn gần hạn nhất cần trả trước ngày ..."],
  ["làm thẻ thư viện như thế nào", "Bạn vào mục Tài khoản → Thẻ mượn và bấm Gửi yêu cầu tạo thẻ, thư viện sẽ duyệt trong ngày."],
  ["mua tài liệu bài giảng ở đâu", "Bạn vào mục Tài liệu bài giảng trên web hoặc app, đặt hàng rồi thanh toán tại quầy tầng 4."],
  ["gia hạn sách được mấy lần", "Mỗi cuốn được gia hạn 1 lần, thêm 7 ngày, khi sách chưa quá hạn."],
  ["có giáo trình kế toán tài chính không", "Mình tìm thấy: Kế toán tài chính 1 (còn 4 bản), Kế toán tài chính 2 (còn 2 bản)..."],
  ["xin chào", "Chào bạn! Mình là trợ lý thư viện, bạn cần tìm sách hay đặt phòng?"],
];
