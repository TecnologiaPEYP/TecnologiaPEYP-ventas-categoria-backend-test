/*
  Warnings:

  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `RolePermission` DROP FOREIGN KEY `RolePermission_permissionId_fkey`;

-- DropForeignKey
ALTER TABLE `RolePermission` DROP FOREIGN KEY `RolePermission_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `UserRole` DROP FOREIGN KEY `UserRole_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `UserRole` DROP FOREIGN KEY `UserRole_userId_fkey`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'user';

-- DropTable
DROP TABLE `Permission`;

-- DropTable
DROP TABLE `Role`;

-- DropTable
DROP TABLE `RolePermission`;

-- DropTable
DROP TABLE `UserRole`;
