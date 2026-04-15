-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('mod', 'agency', 'user', 'customer') NULL;
