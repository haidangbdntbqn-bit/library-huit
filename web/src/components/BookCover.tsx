import { useState } from "react";
import type { Book } from "../types";
import GeneratedCover from "./GeneratedCover";

type CoverBook = Pick<Book, "code" | "title" | "docType" | "coverUrl"> & Partial<Pick<Book, "author" | "publisher" | "publishYear" | "major">>;

/** Bìa sách: dùng ảnh nếu có link, nếu không (hoặc ảnh lỗi) thì tự sinh bìa từ dữ liệu sách */
export default function BookCover({ book, width }: { book: CoverBook; width?: number }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (book.coverUrl && failedUrl !== book.coverUrl) {
    return (
      <img
        src={book.coverUrl}
        alt={`Bìa sách ${book.title}`}
        loading="lazy"
        onError={() => setFailedUrl(book.coverUrl ?? null)}
        style={{ width: width ?? "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: "3px 8px 8px 3px" }}
      />
    );
  }
  const note = [book.publisher, book.publishYear].filter(Boolean).join(" · ");
  return (
    <GeneratedCover
      width={width}
      info={{
        seed: book.code,
        kind: book.docType === "GIAO_TRINH" ? "Giáo trình" : "Tài liệu tham khảo",
        title: book.title,
        author: book.author,
        majorCode: book.major?.code,
        majorName: book.major ? `Ngành ${book.major.name}` : "Dùng chung các ngành",
        footnote: note || null,
        light: book.docType !== "GIAO_TRINH",
      }}
    />
  );
}
