import type { Book } from "../types";

const PALETTE = ["#1E3A5F", "#7C2D12", "#365314", "#4C1D95", "#0B4DA2", "#8A6A2E", "#9F1239", "#334155"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Bìa sách: dùng ảnh nếu có, nếu không thì tự sinh màu theo mã sách */
export default function BookCover({ book, width }: { book: Pick<Book, "code" | "title" | "docType" | "coverUrl">; width?: number }) {
  if (book.coverUrl) {
    return (
      <img
        src={book.coverUrl}
        alt={`Bìa sách ${book.title}`}
        style={{ width: width ?? "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "4px 10px 10px 4px" }}
      />
    );
  }
  return (
    <div className="book-cover" style={{ background: PALETTE[hash(book.code) % PALETTE.length], width }} aria-hidden>
      <span className="type">{book.docType === "GIAO_TRINH" ? "Giáo trình" : "Tài liệu tham khảo"}</span>
      <span className="title">{book.title}</span>
    </div>
  );
}
