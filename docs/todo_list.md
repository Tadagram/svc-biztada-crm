# Project TODO List - Worker Management System (MVP)

Danh sách các hạng mục cần hoàn thiện để đạt mục tiêu MVP.

## 🏗️ Cơ sở hạ tầng & Tooling (Sắp hoàn tất)

- [x] Khởi tạo dự án Fastify + TypeScript.
- [x] Thiết lập Database Schema (PostgreSQL).
- [x] Cấu hình Prisma ORM & Migrations.
- [x] Cài đặt ESLint, Prettier, Husky.
- [x] Thiết lập JWT với RS256 (Public/Private Key).
- [x] Cấu hình Path Alias (`@plugins`, `@src`).
- [x] Hoàn thiện Plugin Compression & Rate Limit.

## 🔐 Authentication & Security

- [x] **Hybrid RBAC System**:
  - [x] Module lấy quyền theo Role.
  - [x] Module kiểm tra quyền ghi đè (User Permission Overrides).

## 👥 User & Agency Management

- [x] **User CRUD API** (cơ bản):
  - [x] `POST /users` – Tạo user.
  - [x] `GET /users` – Lấy danh sách có **pagination** (limit/offset), filter role/status/search.
  - [x] `GET /users/:userId` – Lấy user theo ID.
  - [x] `PUT /users/:userId` – Cập nhật user.
  - [x] `DELETE /users/:userId` – Soft delete user.
- [x] **Permission API**:
  - [x] `POST /permissions` – Tạo permission.
  - [x] `GET /permissions` – Lấy danh sách có pagination.
  - [x] `PUT /permissions/:permissionId` – Cập nhật.
  - [x] `DELETE /permissions/:permissionId` – Soft delete.
- [x] **Data Isolation**: GET /users chỉ trả về user thuộc agency của caller (khi role = agency).
- [x] **Agency Management**: Mod tạo/xem/khoá agency (filter role=agency trong user API).

## 🤖 Worker Management (Ưu tiên tiếp theo)

- [x] **Worker CRUD** (MOD only):
  - [x] `POST /workers` – Tạo worker mới vào kho.
  - [x] `GET /workers` – Danh sách worker có pagination, filter status.
  - [x] `GET /workers/:workerId` – Chi tiết worker.
  - [x] `PUT /workers/:workerId` – Cập nhật thông tin worker.
  - [x] `DELETE /workers/:workerId` – Soft delete (với guard kiểm tra active assignment).
- [x] **Agency ↔ Worker Assignment** (MOD only):
  - [x] `POST /agency-workers` – Gán worker cho agency.
  - [x] `GET /agency-workers` – Danh sách assignments (filter agency_user_id, status).
  - [x] `DELETE /agency-workers/:agencyWorkerId` – Thu hồi worker khỏi agency.
- [x] **Worker Usage** (Agency/User):
  - [x] `POST /agency-workers/:agencyWorkerId/assign-user` – Agency gán worker cho user cụ thể.
  - [x] `POST /agency-workers/:agencyWorkerId/release` – Agency/User trả worker (set `using_by = null`).
  - [x] Tự động tạo `WorkerUsageLogs` khi assign/release.
  - [x] Khi gán lại worker sang user khác → đóng log cũ, mở log mới.

## 📊 Monitoring & API

- [x] `GET /health` – Health check endpoint (DB ping, uptime).
- [x] `GET /workers/active?agencyId=` – Danh sách worker đang hoạt động của agency.
- [x] `GET /usage-logs?workerId=&agencyId=&userId=` – Lịch sử sử dụng có pagination.

## 🚀 Deployment & Polish

- [x] Setup Dockerfile cho Backend.
- [x] Viết Scripts Seed dữ liệu mẫu (Users, Workers, Permissions).
- [x] Hoàn thiện tài liệu API (Swagger/Scalar đã có, cần cập nhật schemas mới).
