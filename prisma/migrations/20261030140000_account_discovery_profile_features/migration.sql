ALTER TABLE `User`
  ADD COLUMN `profileNote` VARCHAR(180) NULL,
  ADD COLUMN `profileNoteAudience` ENUM('EVERYONE', 'FOLLOWERS', 'CLOSE_FRIENDS', 'SELECTED') NOT NULL DEFAULT 'EVERYONE',
  ADD COLUMN `profileNoteExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `profileMusicTrackId` VARCHAR(40) NULL,
  ADD COLUMN `profileMusicTitle` VARCHAR(200) NULL,
  ADD COLUMN `profileMusicArtist` VARCHAR(200) NULL,
  ADD COLUMN `profileMusicArtworkUrl` VARCHAR(2048) NULL,
  ADD COLUMN `profileMusicPreviewUrl` VARCHAR(2048) NULL,
  ADD COLUMN `profileMusicTrackUrl` VARCHAR(2048) NULL,
  ADD COLUMN `themePreference` ENUM('SYSTEM', 'LIGHT', 'DARK') NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN `showActivityStatus` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `lastActiveAt` DATETIME(3) NULL;

ALTER TABLE `Post`
  ADD COLUMN `hideLikeCount` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `Comment`
  ADD COLUMN `gifUrl` VARCHAR(2048) NULL,
  ADD COLUMN `gifAttributionUrl` VARCHAR(2048) NULL,
  ADD COLUMN `gifLicense` VARCHAR(100) NULL;

ALTER TABLE `Story`
  ADD COLUMN `allowReshare` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `sharedStoryId` CHAR(36) NULL,
  ADD INDEX `Story_sharedStoryId_idx` (`sharedStoryId`),
  ADD CONSTRAINT `Story_sharedStoryId_fkey` FOREIGN KEY (`sharedStoryId`) REFERENCES `Story` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `SavedAccount` (
  `id` CHAR(36) NOT NULL,
  `ownerId` CHAR(36) NOT NULL,
  `accountUserId` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SavedAccount_ownerId_accountUserId_key` (`ownerId`, `accountUserId`),
  INDEX `SavedAccount_ownerId_createdAt_idx` (`ownerId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `SavedAccount_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SavedAccount_accountUserId_fkey` FOREIGN KEY (`accountUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserActivity` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `targetUserId` CHAR(36) NOT NULL,
  `action` ENUM('FOLLOWED', 'UNFOLLOWED') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `UserActivity_userId_createdAt_idx` (`userId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `UserActivity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserActivity_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
