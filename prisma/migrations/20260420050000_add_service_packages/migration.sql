CREATE TABLE `service_packages` (
  `service_package_id` CHAR(36) NOT NULL,
  `product_code` VARCHAR(64) NOT NULL,
  `price_per_month` DECIMAL(15,2) NOT NULL,
  `license_key_count` INT NOT NULL,
  `facebook_personal_limit` INT NOT NULL,
  `facebook_fanpage_limit` INT NOT NULL,
  `zalo_limit` INT NOT NULL,
  `tiktok_limit` INT NOT NULL,
  `telegram_limit` INT NOT NULL,
  `bonus` VARCHAR(255) NULL,
  `agent_discount_percent` INT NOT NULL DEFAULT 0,
  `community_support` BOOLEAN NOT NULL DEFAULT true,
  `support_24_7` BOOLEAN NOT NULL DEFAULT false,
  `type` ENUM('personal', 'enterprise') NOT NULL,
  `is_popular` BOOLEAN NOT NULL DEFAULT false,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `service_packages_product_code_key`(`product_code`),
  INDEX `service_packages_type_is_active_sort_order_idx`(`type`, `is_active`, `sort_order`),
  PRIMARY KEY (`service_package_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `service_packages` (
  `service_package_id`,
  `product_code`,
  `price_per_month`,
  `license_key_count`,
  `facebook_personal_limit`,
  `facebook_fanpage_limit`,
  `zalo_limit`,
  `tiktok_limit`,
  `telegram_limit`,
  `bonus`,
  `agent_discount_percent`,
  `community_support`,
  `support_24_7`,
  `type`,
  `is_popular`,
  `sort_order`,
  `is_active`
)
VALUES
  (UUID(), 'PERSONAL_1APP_2ACC', 20, 1, 2, 2, 2, 2, 2, NULL, 0, true, false, 'personal', false, 10, true),
  (UUID(), 'PERSONAL_1APP_5ACC', 40, 1, 5, 5, 5, 5, 5, NULL, 0, true, false, 'personal', false, 20, true),
  (UUID(), 'ENTERPRISE_10APP_50ACC', 400, 10, 50, 50, 50, 50, 50, '+300', 10, true, true, 'enterprise', true, 30, true),
  (UUID(), 'ENTERPRISE_100APP_500ACC', 4000, 100, 500, 500, 500, 500, 500, '+2,000', 20, true, true, 'enterprise', false, 40, true),
  (UUID(), 'ENTERPRISE_1000APP_5000ACC', 40000, 1000, 5000, 5000, 5000, 5000, 5000, '+15,000', 30, true, true, 'enterprise', false, 50, true),
  (UUID(), 'ENTERPRISE_10000APP_50000ACC', 400000, 10000, 50000, 50000, 50000, 50000, 50000, '+125,000', 40, true, true, 'enterprise', false, 60, true),
  (UUID(), 'ENTERPRISE_100000APP_500000ACC', 4000000, 100000, 500000, 500000, 500000, 500000, 500000, '+1,200,000', 50, true, true, 'enterprise', false, 70, true);
