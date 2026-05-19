-- Note: enums are declared inline as MySQL column types (ENUM(...))

-- CreateTable: promotions
CREATE TABLE `promotions` (
  `promotion_id`  CHAR(36)        NOT NULL,
  `name`          VARCHAR(255)    NOT NULL,
  `message`       TEXT            NOT NULL,
  `credit_amount` DECIMAL(15, 2)  NOT NULL,
  `target_type`   ENUM('all', 'custom') NOT NULL DEFAULT 'all',
  `status`        ENUM('draft', 'executed', 'cancelled') NOT NULL DEFAULT 'draft',
  `created_by`    CHAR(36)        NOT NULL,
  `executed_by`   CHAR(36)        NULL,
  `executed_at`   DATETIME(0)     NULL,
  `created_at`    DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at`    DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  INDEX `promotions_status_created_at_idx`(`status`, `created_at` DESC),
  PRIMARY KEY (`promotion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: promotion_user_targets
CREATE TABLE `promotion_user_targets` (
  `id`            CHAR(36)  NOT NULL,
  `promotion_id`  CHAR(36)  NOT NULL,
  `user_id`       CHAR(36)  NOT NULL,

  UNIQUE INDEX `promotion_user_targets_promotion_id_user_id_key`(`promotion_id`, `user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: promotion_execution_logs
CREATE TABLE `promotion_execution_logs` (
  `log_id`        CHAR(36)        NOT NULL,
  `promotion_id`  CHAR(36)        NOT NULL,
  `user_id`       CHAR(36)        NOT NULL,
  `credit_amount` DECIMAL(15, 2)  NOT NULL,
  `notified`      BOOLEAN         NOT NULL DEFAULT false,
  `created_at`    DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

  INDEX `promotion_execution_logs_promotion_id_idx`(`promotion_id`),
  INDEX `promotion_execution_logs_user_id_idx`(`user_id`),
  PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `promotions`
  ADD CONSTRAINT `promotions_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `promotions`
  ADD CONSTRAINT `promotions_executed_by_fkey`
  FOREIGN KEY (`executed_by`) REFERENCES `users`(`user_id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `promotion_user_targets`
  ADD CONSTRAINT `promotion_user_targets_promotion_id_fkey`
  FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`promotion_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `promotion_user_targets`
  ADD CONSTRAINT `promotion_user_targets_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `promotion_execution_logs`
  ADD CONSTRAINT `promotion_execution_logs_promotion_id_fkey`
  FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`promotion_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `promotion_execution_logs`
  ADD CONSTRAINT `promotion_execution_logs_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
