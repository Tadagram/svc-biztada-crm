-- Add guest_id to strategy_session_logs and make user_id nullable.
-- This allows guest sessions to be logged before the user creates an account.
-- When a guest claims their data (POST /strategy/claim-guest), both
-- user_id and guest_id rows are updated atomically.

-- 1. Make user_id nullable (guests don't have a userId)
ALTER TABLE `strategy_session_logs`
  MODIFY COLUMN `user_id` CHAR(36) NULL;

-- 2. Add guest_id column
ALTER TABLE `strategy_session_logs`
  ADD COLUMN `guest_id` CHAR(36) NULL AFTER `user_id`,
  ADD INDEX `strategy_session_logs_guest_id_idx` (`guest_id`);
