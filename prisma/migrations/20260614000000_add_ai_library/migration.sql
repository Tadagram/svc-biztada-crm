-- CreateTable
CREATE TABLE `ai_tool_registry` (
    `tool_id` CHAR(36) NOT NULL,
    `business_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `api_endpoint` VARCHAR(255) NOT NULL,
    `api_method` VARCHAR(10) NOT NULL,
    `payload_schema` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `ai_tool_registry_business_id_is_active_idx`(`business_id`, `is_active`),
    PRIMARY KEY (`tool_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_skill_knowledge` (
    `knowledge_id` CHAR(36) NOT NULL,
    `business_id` VARCHAR(64) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `ai_skill_knowledge_business_id_is_active_idx`(`business_id`, `is_active`),
    PRIMARY KEY (`knowledge_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
