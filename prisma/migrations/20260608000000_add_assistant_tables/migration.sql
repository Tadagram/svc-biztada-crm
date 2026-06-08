-- AlterTable
ALTER TABLE `credit_ledger_entries` MODIFY `entry_type` ENUM('TOPUP_APPROVED', 'USAGE', 'ADJUSTMENT', 'REFUND', 'MARKETPLACE_HOLD', 'MARKETPLACE_RELEASE', 'MARKETPLACE_FEE', 'MARKETPLACE_REFUND', 'MARKETPLACE_WITHDRAWAL') NOT NULL;

-- AlterTable
ALTER TABLE `user_credit_balances` ADD COLUMN `escrow_credits` DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ai_assistant_sessions` (
    `session_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `business_id` CHAR(36) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_assistant_messages` (
    `message_id` CHAR(36) NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `tool_actions` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_listings` (
    `listing_id` CHAR(36) NOT NULL,
    `business_id` VARCHAR(64) NOT NULL,
    `seller_id` CHAR(36) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `type` ENUM('seeding', 'ai') NOT NULL,
    `credits` DECIMAL(15, 2) NOT NULL,
    `banner` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('pending', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `marketplace_listings_business_id_status_idx`(`business_id`, `status`),
    INDEX `marketplace_listings_seller_id_idx`(`seller_id`),
    PRIMARY KEY (`listing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_trades` (
    `trade_id` CHAR(36) NOT NULL,
    `listing_id` CHAR(36) NOT NULL,
    `buyer_id` CHAR(36) NOT NULL,
    `seller_id` CHAR(36) NOT NULL,
    `credits` DECIMAL(15, 2) NOT NULL,
    `fee_credits` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `status` ENUM('escrow', 'completed', 'refunded', 'disputed') NOT NULL DEFAULT 'escrow',
    `order_ref` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `marketplace_trades_order_ref_key`(`order_ref`),
    INDEX `marketplace_trades_buyer_id_idx`(`buyer_id`),
    INDEX `marketplace_trades_seller_id_idx`(`seller_id`),
    INDEX `marketplace_trades_status_idx`(`status`),
    PRIMARY KEY (`trade_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_withdrawals` (
    `withdrawal_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `destination` VARCHAR(255) NOT NULL,
    `request_ref` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `marketplace_withdrawals_request_ref_key`(`request_ref`),
    INDEX `marketplace_withdrawals_user_id_idx`(`user_id`),
    INDEX `marketplace_withdrawals_status_idx`(`status`),
    PRIMARY KEY (`withdrawal_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_messages` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `business_id` VARCHAR(255) NULL,
    `role` VARCHAR(20) NOT NULL,
    `content` TEXT NOT NULL,
    `tool_actions` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `assistant_messages_user_id_idx`(`user_id`),
    INDEX `assistant_messages_business_id_idx`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_assistant_memories` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `preferences` JSON NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_assistant_memories_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_business_playbooks` (
    `id` CHAR(36) NOT NULL,
    `playbook_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `steps` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `ai_business_playbooks_playbook_id_key`(`playbook_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_credit_balances` ADD CONSTRAINT `user_credit_balances_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_ledger_entries` ADD CONSTRAINT `credit_ledger_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_ledger_entries` ADD CONSTRAINT `credit_ledger_entries_topup_id_fkey` FOREIGN KEY (`topup_id`) REFERENCES `topup_requests`(`topup_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_package_purchases` ADD CONSTRAINT `service_package_purchases_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_package_purchases` ADD CONSTRAINT `service_package_purchases_service_package_id_fkey` FOREIGN KEY (`service_package_id`) REFERENCES `service_packages`(`service_package_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_executed_by_fkey` FOREIGN KEY (`executed_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_user_targets` ADD CONSTRAINT `promotion_user_targets_promotion_id_fkey` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`promotion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_user_targets` ADD CONSTRAINT `promotion_user_targets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_execution_logs` ADD CONSTRAINT `promotion_execution_logs_promotion_id_fkey` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`promotion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_execution_logs` ADD CONSTRAINT `promotion_execution_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_assistant_sessions` ADD CONSTRAINT `ai_assistant_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_assistant_messages` ADD CONSTRAINT `ai_assistant_messages_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ai_assistant_sessions`(`session_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_listings` ADD CONSTRAINT `marketplace_listings_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_trades` ADD CONSTRAINT `marketplace_trades_listing_id_fkey` FOREIGN KEY (`listing_id`) REFERENCES `marketplace_listings`(`listing_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_trades` ADD CONSTRAINT `marketplace_trades_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_trades` ADD CONSTRAINT `marketplace_trades_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_withdrawals` ADD CONSTRAINT `marketplace_withdrawals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assistant_messages` ADD CONSTRAINT `assistant_messages_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_assistant_memories` ADD CONSTRAINT `user_assistant_memories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

