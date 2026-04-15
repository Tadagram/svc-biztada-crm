-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "balance" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "topup_requests" (
    "topup_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "proof_note" TEXT,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topup_requests_pkey" PRIMARY KEY ("topup_id")
);

-- CreateIndex
CREATE INDEX "topup_requests_status_submitted_at_idx" ON "topup_requests"("status", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "topup_requests_user_id_created_at_idx" ON "topup_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "topup_requests_reviewed_by_idx" ON "topup_requests"("reviewed_by");

-- AddForeignKey
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
