-- Drop password_hash column — admin auth replaced by Telegram Login Widget
-- No rollback needed: column was nullable and never populated in production.
ALTER TABLE `users` DROP COLUMN `password_hash`;
