-- CreateTable: strategy_content_network
-- Stores Content Network slide payload — business profile, 2 purpose groups (channel building + seeding premise), content pillars with channel/topic/frequency/format/examples.

CREATE TABLE `strategy_content_network` (
  `strategy_content_network_id` CHAR(36) NOT NULL,
  `business_id` VARCHAR(64) NOT NULL DEFAULT 'demo',
  `user_id` CHAR(36) NULL,
  `guest_id` CHAR(36) NULL,
  `payload` JSON NOT NULL,
  `is_demo` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  INDEX `strategy_content_network_business_id_updated_at_idx`(`business_id`, `updated_at` DESC),
  INDEX `strategy_content_network_business_id_user_id_updated_at_idx`(`business_id`, `user_id`, `updated_at` DESC),
  INDEX `strategy_content_network_guest_id_idx`(`guest_id`),
  PRIMARY KEY (`strategy_content_network_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
