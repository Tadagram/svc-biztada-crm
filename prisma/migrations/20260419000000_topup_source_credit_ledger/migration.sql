-- Add enums for top-up source and credit ledger
CREATE TYPE `TopUpSourceChannel` AS ENUM ('DIRECT', 'WHITELABEL');
CREATE TYPE `CreditLedgerEntryType` AS ENUM ('TOPUP_APPROVED', 'USAGE', 'ADJUSTMENT', 'REFUND');
CREATE TYPE `CreditLedgerDirection` AS ENUM ('CREDIT', 'DEBIT');

-- Extend top-up requests with currency/source/credit tracking
ALTER TABLE `topup_requests`
  ADD COLUMN `currency` VARCHAR(8) NOT NULL DEFAULT 'USD',
  ADD COLUMN `credit_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN `source_channel` `TopUpSourceChannel` NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN `sales_agency_uuid` CHAR(36) NULL;

UPDATE `topup_requests` SET `credit_amount` = `amount` WHERE `credit_amount` = 0;

-- User credit balance table
CREATE TABLE `user_credit_balances` (
  `user_id` CHAR(36) NOT NULL,
  `available_credits` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`user_id`)
);

-- Credit ledger for all credit-changing actions
CREATE TABLE `credit_ledger_entries` (
  `credit_entry_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `topup_id` CHAR(36) NULL,
  `entry_type` `CreditLedgerEntryType` NOT NULL,
  `direction` `CreditLedgerDirection` NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `balance_after` DECIMAL(15,2) NOT NULL,
  `purpose` TEXT NULL,
  `source_channel` `TopUpSourceChannel` NOT NULL DEFAULT 'DIRECT',
  `sales_agency_uuid` CHAR(36) NULL,
  `metadata` JSON NULL,
  `created_by` CHAR(36) NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`credit_entry_id`)
);

CREATE INDEX `credit_ledger_entries_user_id_created_at_idx` ON `credit_ledger_entries`(`user_id`, `created_at` DESC);
CREATE INDEX `credit_ledger_entries_entry_type_created_at_idx` ON `credit_ledger_entries`(`entry_type`, `created_at` DESC);
CREATE INDEX `credit_ledger_entries_topup_id_idx` ON `credit_ledger_entries`(`topup_id`);

-- Helpful index for source analytics
CREATE INDEX `topup_requests_source_channel_submitted_at_idx` ON `topup_requests`(`source_channel`, `submitted_at` DESC);
