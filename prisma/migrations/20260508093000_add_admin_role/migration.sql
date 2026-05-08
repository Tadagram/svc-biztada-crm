ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin','mod','agency','accountant','user','customer') NULL;
