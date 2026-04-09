-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('mod', 'agency', 'user', 'customer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('active', 'completed', 'revoked');

-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('allow', 'deny');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "parent_user_id" UUID,
    "agency_name" TEXT,
    "phone_number" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "custom_fields" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_permission_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_permission_id")
);

-- CreateTable
CREATE TABLE "workers" (
    "worker_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("worker_id")
);

-- CreateTable
CREATE TABLE "agency_workers" (
    "agency_worker_id" UUID NOT NULL,
    "agency_user_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "using_by" UUID,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "agency_workers_pkey" PRIMARY KEY ("agency_worker_id")
);

-- CreateTable
CREATE TABLE "worker_usage_logs" (
    "usage_log_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "agency_user_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worker_usage_logs_pkey" PRIMARY KEY ("usage_log_id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "user_permission_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "permission_type" "PermissionType" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_permission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_workers" ADD CONSTRAINT "agency_workers_agency_user_id_fkey" FOREIGN KEY ("agency_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_workers" ADD CONSTRAINT "agency_workers_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_workers" ADD CONSTRAINT "agency_workers_using_by_fkey" FOREIGN KEY ("using_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_usage_logs" ADD CONSTRAINT "worker_usage_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("worker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_usage_logs" ADD CONSTRAINT "worker_usage_logs_agency_user_id_fkey" FOREIGN KEY ("agency_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_usage_logs" ADD CONSTRAINT "worker_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE;
