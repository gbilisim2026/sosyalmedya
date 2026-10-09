-- AlterTable
ALTER TABLE `post` MODIFY `mediaUrl` VARCHAR(2048) NULL,
    MODIFY `mediaType` ENUM('TEXT', 'PHOTO', 'VIDEO') NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE `story` MODIFY `mediaType` ENUM('TEXT', 'PHOTO', 'VIDEO') NOT NULL;
