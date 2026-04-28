-- CreateTable
CREATE TABLE `RegistroCumpleanos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `fechaNacimiento` DATETIME(3) NOT NULL,
    `pais` VARCHAR(191) NOT NULL,
    `tipoDocumento` VARCHAR(191) NOT NULL,
    `numeroDocumento` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroCumpleanos_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegistroCaptacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `fechaNacimiento` DATETIME(3) NOT NULL,
    `pais` VARCHAR(191) NOT NULL,
    `tipoDocumento` VARCHAR(191) NOT NULL,
    `numeroDocumento` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroCaptacion_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
