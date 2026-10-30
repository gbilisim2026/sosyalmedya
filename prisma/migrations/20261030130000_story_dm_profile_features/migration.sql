ALTER TABLE `User`
  ADD COLUMN `avatarScale` DOUBLE NOT NULL DEFAULT 1,
  ADD COLUMN `avatarOffsetX` INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN `avatarOffsetY` INTEGER NOT NULL DEFAULT 50;

ALTER TABLE `Story`
  ADD COLUMN `caption` VARCHAR(1000) NULL,
  ADD COLUMN `isArchived` BOOLEAN NOT NULL DEFAULT false,
  DROP INDEX `Story_userId_expiresAt_idx`,
  ADD INDEX `Story_userId_isArchived_expiresAt_idx` (`userId`, `isArchived`, `expiresAt`);

UPDATE `Story`
SET `isArchived` = true
WHERE `expiresAt` <= CURRENT_TIMESTAMP(3);

ALTER TABLE `DirectMessage`
  ADD COLUMN `mediaUrl` VARCHAR(2048) NULL,
  ADD COLUMN `mediaType` ENUM('TEXT', 'PHOTO', 'VIDEO') NULL;
