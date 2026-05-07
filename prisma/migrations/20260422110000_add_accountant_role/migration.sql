ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('mod', 'agency', 'accountant', 'user', 'customer') NULL;
