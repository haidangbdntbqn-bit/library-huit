/**
 * Trả thông tin đầu sách (tên, tác giả, NXB, năm, ISBN, mô tả) về đúng bộ dữ liệu demo gốc
 * và xóa link ảnh bìa để web dùng bìa tự sinh. Không đụng tới phiếu mượn, bản sách...
 * Chạy: npm run db:restore-books
 */
import { PrismaClient } from "@prisma/client";
import { generate } from "./demo/generate";

const prisma = new PrismaClient();

async function main() {
  const { books } = generate();
  let updated = 0;
  for (const b of books) {
    const r = await prisma.book.updateMany({
      where: { code: b.code },
      data: { title: b.title, author: b.author, publisher: b.publisher, publishYear: b.publishYear, isbn: b.isbn, description: b.description, coverUrl: null },
    });
    updated += r.count;
  }
  console.log(`Đã khôi phục ${updated} đầu sách về dữ liệu gốc.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
