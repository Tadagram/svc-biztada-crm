-- CreateTable: guests_info
-- Stores temporary/guest users who register on strategy.biztada.com
-- only with phone number and business name, before having a full account.
-- guest_id is sufficient to create and retrieve all strategy slide data.

CREATE TABLE `guests_info` (
  `guest_id` CHAR(36) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `business_name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `deleted_at` DATETIME(0) NULL,

  UNIQUE INDEX `guests_info_phone_unique` (`phone`),
  INDEX `guests_info_phone_idx` (`phone`),
  PRIMARY KEY (`guest_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
