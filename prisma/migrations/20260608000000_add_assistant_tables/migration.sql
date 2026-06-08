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


