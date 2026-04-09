# Prisma Usage Guide

Tài liệu này hướng dẫn cách sử dụng Prisma để quản lý Database, đồng bộ Schema và chạy Migrations.

---

## 🚀 Các lệnh cơ bản (Basic Commands)

### 1. Đồng bộ Database (First Sync / DB Push)
Nếu bạn đã có Database đang chạy (Docker) và muốn đẩy cấu trúc từ file `schema.prisma` lên ngay lập tức:
```bash
npx prisma db push
```
> [!NOTE]
> Lệnh này phù hợp trong quá trình phát triển (Prototyping) khi bạn thay đổi schema liên tục và chưa cần lưu lại lịch sử migration.

### 2. Tạo bản Migration (Tạo \& Chạy Migration)
Khi bạn muốn lưu lại lịch sử thay đổi của Database để có thể deploy lên Production:
```bash
npx prisma migrate dev --name init_database
```
*   `--name`: Tên của bản migration (ví dụ: `add_user_table`).
*   Lệnh này sẽ tạo ra một thư mục `prisma/migrations` chứa file SQL.

### 3. Sinh Client (Generate Client)
Mỗi khi bạn thay đổi `schema.prisma`, bạn cần chạy lệnh này để cập nhật TypeScript types:
```bash
npx prisma generate
```

### 4. Giao diện Database (Prisma Studio)
Mở một giao diện web để xem và chỉnh sửa dữ liệu trực tiếp:
```bash
npx prisma studio
```

---

## 🛠️ Quy trình phát triển (Workflow)

1.  Thay đổi cấu trúc bảng trong file `prisma/schema.prisma`.
2.  Chạy `npx prisma migrate dev` để áp dụng thay đổi vào Database.
3.  Prisma sẽ tự động chạy `generate` để cập nhật code TypeScript.
4.  Sử dụng `PrismaClient` trong code Backend để thao tác với dữ liệu.

---

## 📂 Cấu trúc thư mục
*   `prisma/schema.prisma`: File cấu trúc chính (Single source of truth).
*   `prisma/migrations/`: Chứa lịch sử các file SQL thay đổi database.
*   `.env`: Chứa `DATABASE_URL` để Prisma biết cách kết nối.

---

## ⚠️ Lưu ý quan trọng
*   Đảm bảo Docker PostgreSQL đang chạy (`docker-compose up -d`) trước khi chạy bất kỳ lệnh Prisma nào.
*   Tránh sửa tay trực tiếp vào database qua các công cụ như TablePlus hay DBeaver mà không thông qua Prisma Migrate, vì nó sẽ gây lệch (drift) schema.
