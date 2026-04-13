# RBAC Implementation Plan — Worker Backend

> **Ngày lập:** 2026-04-13  
> **Mục tiêu:** Triển khai toàn bộ hệ thống phân quyền (Authentication Guard + Authorization + Data Isolation)

---

## 📊 Hiện trạng phân tích (Current State)

### ✅ Đã có sẵn — KHÔNG cần viết lại

| Thành phần              | File                                                  | Ghi chú                                     |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------- |
| JWT Plugin (RS256)      | `src/plugins/jwt.ts`                                  | `authenticate` decorator đã hoạt động       |
| RBAC Logic Core         | `src/handlers/permission/permissionHelper.ts`         | Đủ 5 functions                              |
| Check endpoints         | `POST /permissions/check`, `/check-all`, `/check-any` | Dùng để test thủ công                       |
| User Override endpoints | `GET/POST/DELETE /permissions/user/:userId/override`  | Quản lý allow/deny                          |
| Permission CRUD         | `POST/GET/PUT/DELETE /permissions`                    | Đầy đủ                                      |
| Seed dữ liệu mẫu cơ bản | `prisma/seed.ts`                                      | Có users/workers, nhưng permission codes cũ |

### `permissionHelper.ts` — Các hàm đã có

```
getRolePermissions(prisma, role)           → Lấy quyền mặc định theo role
getUserPermissionOverrides(prisma, userId) → Lấy override allow/deny của user
getUserEffectivePermissions(prisma, userId, role) → Merge: deny xóa, allow thêm
hasPermission(prisma, userId, role, code)  → Boolean check 1 quyền
hasAllPermissions(...)                     → Boolean check nhiều quyền (AND)
hasAnyPermission(...)                      → Boolean check nhiều quyền (OR)
addUserPermissionOverride(...)             → Upsert override
removeUserPermissionOverride(...)          → Xóa override
```

### ❌ Còn thiếu — Cần implement

| Vấn đề                                      | Mức độ      | Chi tiết                                                                             |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| **JWT payload thiếu `parentUserId`**        | 🔴 Critical | Payload hiện tại: `{ userId, role, agencyName }` → thiếu `parentUserId` để isolation |
| **Không có `requirePermission` preHandler** | 🔴 Critical | Logic RBAC có nhưng chưa gắn vào route nào                                           |
| **TẤT CẢ routes đang public**               | 🔴 Critical | Không có route nào có `authenticate` preHandler                                      |
| **Không có Data Isolation**                 | 🔴 Critical | `GET /users` trả về toàn bộ DB, không phân biệt caller                               |
| **Permission codes cũ trong seed**          | 🟡 Medium   | Seed dùng `workers.assign`, `users.manage`... không khớp với plan mới                |
| **RolePermissions table trống**             | 🟡 Medium   | Bảng `role_permissions` chưa có dữ liệu defaults                                     |

---

## 🗂️ Permission Codes — Chuẩn hóa mới

> **Convention:** `resource:action` (dùng dấu `:` làm separator)

### Danh sách đầy đủ

| Code                           | Tên hiển thị           | Mô tả                                            |
| ------------------------------ | ---------------------- | ------------------------------------------------ |
| `users:read`                   | Xem danh sách Users    | `GET /users`, `GET /users/:id`                   |
| `users:create`                 | Tạo User               | `POST /users`                                    |
| `users:update`                 | Cập nhật User          | `PUT /users/:userId`                             |
| `users:delete`                 | Xóa User               | `DELETE /users/:userId`                          |
| `workers:read`                 | Xem danh sách Workers  | `GET /workers`, `GET /workers/:id`               |
| `workers:create`               | Tạo Worker             | `POST /workers`                                  |
| `workers:update`               | Cập nhật Worker        | `PUT /workers/:workerId`                         |
| `workers:delete`               | Xóa Worker             | `DELETE /workers/:workerId`                      |
| `agency_workers:read`          | Xem Agency Workers     | `GET /agency-workers`                            |
| `agency_workers:assign`        | Giao Worker cho Agency | `POST /agency-workers`                           |
| `agency_workers:revoke`        | Thu hồi Worker         | `DELETE /agency-workers/:id`                     |
| `agency_workers:assign_user`   | Giao Worker cho User   | `POST /agency-workers/:id/assign-user`           |
| `agency_workers:release`       | Release Worker         | `POST /agency-workers/:id/release`               |
| `permissions:read`             | Xem Permissions        | `GET /permissions`                               |
| `permissions:create`           | Tạo Permission         | `POST /permissions`                              |
| `permissions:update`           | Cập nhật Permission    | `PUT /permissions/:id`                           |
| `permissions:delete`           | Xóa Permission         | `DELETE /permissions/:id`                        |
| `permissions:manage_overrides` | Quản lý Override User  | `POST/DELETE /permissions/user/:userId/override` |

### RolePermissions Defaults

| Role       | Quyền mặc định                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `mod`      | **Bypass toàn bộ** (không cần check — super admin)                                                                                          |
| `agency`   | `users:read`, `users:create`, `users:update`, `workers:read`, `agency_workers:read`, `agency_workers:assign_user`, `agency_workers:release` |
| `user`     | `workers:read`, `agency_workers:read`                                                                                                       |
| `customer` | _(không có mặc định)_                                                                                                                       |

---

## 🔐 Data Isolation Rules

### `GET /users`

```
caller.role = 'mod'      → Xem toàn bộ (không filter)
caller.role = 'agency'   → WHERE parent_user_id = caller.userId
caller.role = 'user'     → WHERE parent_user_id = caller.parentUserId  (cùng agency)
caller.role = 'customer' → 403 Forbidden
```

### `GET /agency-workers`

```
caller.role = 'mod'      → Xem toàn bộ
caller.role = 'agency'   → WHERE agency_user_id = caller.userId
caller.role = 'user'     → WHERE using_by = caller.userId
caller.role = 'customer' → 403 Forbidden
```

### `GET /workers`

```
caller.role = 'mod'      → Xem toàn bộ
caller.role = 'agency'   → Chỉ workers được assign cho agency (JOIN agency_workers)
caller.role = 'user'     → Chỉ worker đang được assign cho mình
```

---

## 📋 Implementation Plan — Chi tiết theo Phase

---

### Phase 1 — Cập nhật JWT Payload

**Ảnh hưởng:** `src/plugins/jwt.ts`, `src/handlers/user/userHelper.ts`  
**Thời gian ước tính:** ~15 phút

#### 1.1 — `src/plugins/jwt.ts`

Thêm `parentUserId` vào interface `FastifyJWT`:

```typescript
// TRƯỚC
interface FastifyJWT {
  payload: {
    userId: string;
    role: string;
    agencyName?: string | null;
  };
}

// SAU
interface FastifyJWT {
  payload: {
    userId: string;
    role: string;
    agencyName?: string | null;
    parentUserId?: string | null; // ← THÊM
  };
}
```

#### 1.2 — `src/handlers/user/userHelper.ts`

Cập nhật `generateToken()` để đưa `parentUserId` vào payload:

```typescript
// TRƯỚC
const token = jwt.sign({ userId, role, agencyName }, ...);

// SAU
const token = jwt.sign({
  userId: user.user_id,
  role: user.role,
  agencyName: user.agency_name,
  parentUserId: user.parent_user_id,  // ← THÊM
}, ...);
```

> ⚠️ **Lưu ý:** Sau khi thay đổi, tất cả token cũ sẽ không có `parentUserId`. User cần login lại để lấy token mới.

---

### Phase 2 — RBAC Plugin

**File mới:** `src/plugins/rbac.ts`  
**Thời gian ước tính:** ~30 phút

Plugin sẽ decorate Fastify instance với `requirePermission` factory:

```typescript
// Usage tại route definition:
fastify.get(
  '/',
  {
    preHandler: [fastify.authenticate, fastify.requirePermission('users:read')],
  },
  handler,
);
```

**Logic bên trong `requirePermission`:**

```
1. request.user đã có sau khi authenticate chạy
2. Extract: { userId, role } from request.user
3. Nếu role === 'mod' → PASS (bypass check)
4. Gọi hasPermission(prisma, userId, role, permissionCode)
5. Nếu false → reply 403 { success: false, message: 'Forbidden' }
6. Nếu true → PASS (gọi next)
```

**Khai báo TypeScript (augment Fastify):**

```typescript
declare module 'fastify' {
  interface FastifyInstance {
    requirePermission: (
      code: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
```

---

### Phase 3 — Seed dữ liệu (Viết lại `prisma/seed.ts`)

**File:** `prisma/seed.ts`  
**Thời gian ước tính:** ~30 phút

#### Thứ tự seed:

1. **Xóa dữ liệu cũ** (`userPermissions`, `rolePermissions`, `permissions`) để tránh conflict codes cũ
2. **Seed Permissions** — 18 permissions với codes chuẩn mới (`users:read`, `workers:create`...)
3. **Seed RolePermissions defaults** — Link role → permissions theo bảng trên
4. **Seed Users** — 1 mod, 3 agency, 6 user, 3 customer
5. **Seed Workers** — 10 workers các trạng thái
6. **Seed AgencyWorkers** — Gán mẫu

> 💡 Dùng `upsert` cho users/workers, `deleteMany` + `createMany` cho permissions để clean slate.

---

### Phase 4 — Bảo vệ Routes

**Ảnh hưởng:** 4 files `*.routes.ts`  
**Thời gian ước tính:** ~1 giờ

#### 4.1 — `src/routes/user.routes.ts`

| Route             | preHandler                                          |
| ----------------- | --------------------------------------------------- |
| `POST /`          | `[authenticate, requirePermission('users:create')]` |
| `GET /`           | `[authenticate, requirePermission('users:read')]`   |
| `GET /:userId`    | `[authenticate, requirePermission('users:read')]`   |
| `PUT /:userId`    | `[authenticate, requirePermission('users:update')]` |
| `DELETE /:userId` | `[authenticate, requirePermission('users:delete')]` |

#### 4.2 — `src/routes/worker.routes.ts`

| Route               | preHandler                                            |
| ------------------- | ----------------------------------------------------- |
| `POST /`            | `[authenticate, requirePermission('workers:create')]` |
| `GET /`             | `[authenticate, requirePermission('workers:read')]`   |
| `GET /:workerId`    | `[authenticate, requirePermission('workers:read')]`   |
| `PUT /:workerId`    | `[authenticate, requirePermission('workers:update')]` |
| `DELETE /:workerId` | `[authenticate, requirePermission('workers:delete')]` |

#### 4.3 — `src/routes/agencyWorker.routes.ts`

| Route                   | preHandler                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| `POST /`                | `[authenticate, requirePermission('agency_workers:assign')]`      |
| `GET /`                 | `[authenticate, requirePermission('agency_workers:read')]`        |
| `DELETE /:id`           | `[authenticate, requirePermission('agency_workers:revoke')]`      |
| `POST /:id/assign-user` | `[authenticate, requirePermission('agency_workers:assign_user')]` |
| `POST /:id/release`     | `[authenticate, requirePermission('agency_workers:release')]`     |

#### 4.4 — `src/routes/permission.routes.ts`

| Route                                     | preHandler                                                          |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `POST /`                                  | `[authenticate, requirePermission('permissions:create')]`           |
| `GET /`                                   | `[authenticate, requirePermission('permissions:read')]`             |
| `PUT /:permissionId`                      | `[authenticate, requirePermission('permissions:update')]`           |
| `DELETE /:permissionId`                   | `[authenticate, requirePermission('permissions:delete')]`           |
| `POST /check`, `/check-all`, `/check-any` | `[authenticate]` (chỉ cần auth)                                     |
| `GET /user/:userId`                       | `[authenticate]`                                                    |
| `POST/DELETE /user/:userId/override`      | `[authenticate, requirePermission('permissions:manage_overrides')]` |

> ⚠️ **Lưu ý quan trọng:** `POST /auth/verify` và `POST /auth/refresh` **KHÔNG** được thêm preHandler (public routes).

---

### Phase 5 — Data Isolation

**Ảnh hưởng:** `getUsersHandler.ts`, `getAgencyWorkersHandler.ts`, `getWorkersHandler.ts`  
**Thời gian ước tính:** ~30 phút

#### Pattern chung:

```typescript
// Trong handler, sau khi authenticate đã chạy:
const caller = request.user; // { userId, role, parentUserId }

// Build isolation filter
const isolationFilter = buildIsolationFilter(caller);

// Merge với where clause hiện có
const where = { deleted_at: null, ...isolationFilter, ...userFilters };
```

#### `getUsersHandler.ts` — Thêm isolation:

```typescript
function buildUserIsolation(caller: JWTPayload) {
  if (caller.role === 'mod') return {};
  if (caller.role === 'agency') return { parent_user_id: caller.userId };
  if (caller.role === 'user') return { parent_user_id: caller.parentUserId };
  return null; // customer → block
}
```

#### `getAgencyWorkersHandler.ts` — Thêm isolation:

```typescript
function buildAgencyWorkerIsolation(caller: JWTPayload) {
  if (caller.role === 'mod') return {};
  if (caller.role === 'agency') return { agency_user_id: caller.userId };
  if (caller.role === 'user') return { using_by: caller.userId };
  return null; // customer → block
}
```

---

### Phase 6 — Frontend xử lý lỗi 401/403

**Ảnh hưởng:** `worker-fe/src/libs/axios.ts`, `worker-fe/src/store/useAuthStore.ts`  
**Thời gian ước tính:** ~20 phút

Khi backend trả về:

- **401 Unauthorized** → Token hết hạn → Redirect về `/login`
- **403 Forbidden** → Không có quyền → Hiển thị toast "Bạn không có quyền thực hiện thao tác này"

---

## 📅 Todo List — Theo thứ tự ưu tiên

```
[ ] Phase 1: Cập nhật JWT payload (thêm parentUserId)
    [ ] 1.1 — Sửa interface FastifyJWT trong src/plugins/jwt.ts
    [ ] 1.2 — Sửa generateToken() trong src/handlers/user/userHelper.ts

[ ] Phase 2: Tạo RBAC Plugin
    [ ] 2.1 — Tạo file src/plugins/rbac.ts với requirePermission factory
    [ ] 2.2 — Đăng ký plugin trong index.ts (hoặc app entry point)
    [ ] 2.3 — Kiểm tra TypeScript: npx tsc --noEmit

[ ] Phase 3: Seed dữ liệu chuẩn hóa
    [ ] 3.1 — Viết lại prisma/seed.ts với 18 permission codes mới
    [ ] 3.2 — Thêm seed RolePermissions defaults (agency/user defaults)
    [ ] 3.3 — Chạy: npx prisma db seed

[ ] Phase 4: Bảo vệ tất cả routes
    [ ] 4.1 — src/routes/user.routes.ts (5 routes)
    [ ] 4.2 — src/routes/worker.routes.ts (5 routes)
    [ ] 4.3 — src/routes/agencyWorker.routes.ts (5 routes)
    [ ] 4.4 — src/routes/permission.routes.ts (10 routes)
    [ ] 4.5 — Test: curl /users (không có token → 401)
    [ ] 4.6 — Test: Login → GET /users (có token → 200)

[ ] Phase 5: Data Isolation
    [ ] 5.1 — Sửa getUsersHandler.ts: tự động filter theo caller.role
    [ ] 5.2 — Sửa getAgencyWorkersHandler.ts: tự động filter theo caller.role
    [ ] 5.3 — Sửa getWorkersHandler.ts: filter theo agency assignment
    [ ] 5.4 — Test: Agency login → GET /users (chỉ thấy user của mình)

[ ] Phase 6: Frontend error handling
    [ ] 6.1 — Axios interceptor: 401 → logout + redirect /login
    [ ] 6.2 — Axios interceptor: 403 → toast "Không có quyền"
    [ ] 6.3 — Test E2E: Đăng nhập user thường → thử tạo worker → nhận 403 toast
```

---

## 🧪 Test Scenarios sau khi hoàn thành

| Scenario                                       | Input                                                                         | Expected                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Gọi API không có token                         | `GET /users`                                                                  | `401 Unauthorized`                                    |
| Mod xem users                                  | Mod token + `GET /users`                                                      | `200` — toàn bộ users                                 |
| Agency xem users                               | Agency token + `GET /users`                                                   | `200` — chỉ users có `parent_user_id = agency.userId` |
| User tạo worker                                | User token + `POST /workers`                                                  | `403 Forbidden`                                       |
| Agency giao worker cho user không thuộc agency | Agency token + `POST /agency-workers/:id/assign-user` với userId ngoài agency | `400 Bad Request` (business logic)                    |
| Override: deny workers:read cho user           | Admin set deny → User token + `GET /workers`                                  | `403 Forbidden`                                       |
| Override: allow workers:create cho user        | Admin set allow → User token + `POST /workers`                                | `201 Created`                                         |

---

## ⚠️ Rủi ro & Lưu ý

1. **Token invalidation** — Khi thêm `parentUserId` vào payload, tokens hiện tại sẽ thiếu trường này. Trong Phase 5 cần guard: `caller.parentUserId ?? null` thay vì crash.

2. **RolePermissions vs UserPermissions** — Logic hiện tại trong `permissionHelper.ts` sử dụng `UserPermissions` để kiểm tra OVERRIDE cho từng user. **Bảng `RolePermissions` chưa được dùng trong `getRolePermissions`** — cần kiểm tra lại function này có đang query đúng bảng không.

3. **Performance** — Mỗi request có permission check sẽ query DB 2 lần (role + user overrides). Sau MVP có thể thêm in-memory cache với TTL 60s.

4. **Circular import** — `rbac.ts` plugin cần import `permissionHelper.ts` từ `@handlers/permission` — đây là cross-layer import, chấp nhận được cho MVP.

5. **Seed idempotency** — Seed phải dùng `upsert` để có thể chạy nhiều lần không lỗi.
