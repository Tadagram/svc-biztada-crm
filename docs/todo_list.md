# Project TODO List - Worker Management System (MVP)

Danh sách các hạng mục cần hoàn thiện để đạt mục tiêu MVP.

## 🏗️ Cơ sở hạ tầng & Tooling (Sắp hoàn tất)
- [x] Khởi tạo dự án Fastify + TypeScript.
- [x] Thiết lập Database Schema (PostgreSQL).
- [x] Cấu hình Prisma ORM & Migrations.
- [x] Cài đặt ESLint, Prettier, Husky.
- [x] Thiết lập JWT với RS256 (Public/Private Key).
- [x] Cấu hình Path Alias (`@plugins`, `@src`).
- [ ] Hoàn thiện Plugin Compression & Rate Limit.

## 🔐 Authentication & Security
- [ ] **Middleware JWT**: Xác thực token cho mọi request.
- [ ] **Telegram Login Service**:
    - [ ] API nhận callback/data từ Telegram.
    - [ ] Validate dữ liệu từ Telegram (hash verification).
    - [ ] Tìm hoặc tạo User dựa trên số điện thoại/id.
- [ ] **Hybrid RBAC System**:
    - [ ] Module lấy quyền theo Role.
    - [ ] Module kiểm tra quyền ghi đè (User Permission Overrides).

## 👥 Management Modules (CRUD)
- [ ] **Agency Management**: Mod tạo và quản lý các đại lý.
- [ ] **User Management**: 
    - [ ] Agency tạo và quản lý nhân viên của mình.
    - [ ] Tích hợp `Data Isolation` (chỉ thấy user thuộc agency mình).
- [ ] **Worker Management**:
    - [ ] Mod nhập kho Worker mới.
    - [ ] Gán Worker cho từng Agency.

## 🤖 Worker Assignment Logic
- [ ] **Giao việc (Assignment)**: 
    - [ ] Agency gán worker cho User cụ thể.
    - [ ] Xử lý trạng thái (`active`, `completed`).
- [ ] **Thu hồi/Chuyển đổi**:
    - [ ] Khi gán lại worker, tự động đóng bản ghi cũ và mở bản ghi mới.
- [ ] **Logging**:
    - [ ] Ghi log mỗi khi Worker được bắt đầu/kết thúc sử dụng.

## 📊 Monitoring & API
- [ ] API lấy danh sách Worker đang hoạt động của từng Agency.
- [ ] API báo cáo lịch sử sử dụng (Usage Logs).
- [ ] API theo dõi sức khỏe hệ thống (`/health`).

## 🚀 Deployment & Polish
- [ ] Setup Dockerfile cho Backend.
- [ ] Viết Scripts Seed dữ liệu mẫu (Roles, Permissions).
- [ ] Hoàn thiện tài liệu API (Swagger/Scalar).
