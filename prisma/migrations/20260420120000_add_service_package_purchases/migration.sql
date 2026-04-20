CREATE TABLE `service_package_purchases` (
  `service_package_purchase_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `service_package_id` CHAR(36) NOT NULL,
  `status` ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
  `channel` ENUM('direct', 'agency') NOT NULL DEFAULT 'direct',
  `seller_user_id` CHAR(36) NULL,
  `license_key_count_snapshot` INT NOT NULL,
  `unit_price_usd` DECIMAL(15,2) NOT NULL,
  `total_price_usd` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(8) NOT NULL DEFAULT 'USD',
  `core_note_ref` VARCHAR(128) NULL,
  `failure_reason` TEXT NULL,
  `purchased_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

  UNIQUE INDEX `service_package_purchases_core_note_ref_key`(`core_note_ref`),
  INDEX `service_package_purchases_user_id_purchased_at_idx`(`user_id`, `purchased_at` DESC),
  INDEX `service_package_purchases_service_package_id_purchased_at_idx`(`service_package_id`, `purchased_at` DESC),
  INDEX `service_package_purchases_status_purchased_at_idx`(`status`, `purchased_at` DESC),
  PRIMARY KEY (`service_package_purchase_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `service_package_purchases`
  ADD CONSTRAINT `service_package_purchases_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `service_package_purchases`
  ADD CONSTRAINT `service_package_purchases_service_package_id_fkey`
    FOREIGN KEY (`service_package_id`) REFERENCES `service_packages`(`service_package_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
