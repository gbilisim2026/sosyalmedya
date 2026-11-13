CREATE TABLE `PostMedia` (
    `id` CHAR(36) NOT NULL,
    `postId` CHAR(36) NOT NULL,
    `mediaUrl` VARCHAR(2048) NOT NULL,
    `position` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostMedia_postId_idx`(`postId`),
    UNIQUE INDEX `PostMedia_postId_position_key`(`postId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PostMedia`
    ADD CONSTRAINT `PostMedia_postId_fkey`
    FOREIGN KEY (`postId`) REFERENCES `Post`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
