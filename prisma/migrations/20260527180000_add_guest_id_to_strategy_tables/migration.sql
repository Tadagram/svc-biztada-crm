-- Add guest_id column to all 5 strategy tables.
-- guest_id is the primary lookup key for strategy data on strategy.biztada.com.
-- business_id / user_id columns are kept for backward compatibility (demo fallback path).

ALTER TABLE `strategy_market_profiles`
  ADD COLUMN `guest_id` CHAR(36) NULL AFTER `user_id`,
  ADD INDEX `strategy_market_profiles_guest_id_idx` (`guest_id`);

ALTER TABLE `strategy_action_plans`
  ADD COLUMN `guest_id` CHAR(36) NULL AFTER `user_id`,
  ADD INDEX `strategy_action_plans_guest_id_idx` (`guest_id`);

ALTER TABLE `strategy_features`
  ADD COLUMN `guest_id` CHAR(36) NULL AFTER `user_id`,
  ADD INDEX `strategy_features_guest_id_idx` (`guest_id`);

ALTER TABLE `strategy_matrix`
  ADD COLUMN `guest_id` CHAR(36) NULL AFTER `user_id`,
  ADD INDEX `strategy_matrix_guest_id_idx` (`guest_id`);

ALTER TABLE `strategy_factory`
  ADD COLUMN `guest_id` CHAR(36) NULL AFTER `user_id`,
  ADD INDEX `strategy_factory_guest_id_idx` (`guest_id`);
