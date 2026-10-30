CREATE TABLE `RecommendationPreference` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `personalizedEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `RecommendationPreference_userId_key` (`userId`),
    INDEX `RecommendationPreference_personalizedEnabled_idx` (`personalizedEnabled`),
    PRIMARY KEY (`id`),
    CONSTRAINT `RecommendationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserInterest` (
    `id` CHAR(36) NOT NULL,
    `preferenceId` CHAR(36) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `UserInterest_preferenceId_category_key` (`preferenceId`, `category`),
    INDEX `UserInterest_category_idx` (`category`),
    PRIMARY KEY (`id`),
    CONSTRAINT `UserInterest_preferenceId_fkey` FOREIGN KEY (`preferenceId`) REFERENCES `RecommendationPreference` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RecommendationFeedback` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `feedbackKey` VARCHAR(80) NOT NULL,
    `type` ENUM('NOT_INTERESTED_POST', 'LESS_CATEGORY', 'HIDE_ACCOUNT') NOT NULL,
    `postId` CHAR(36) NULL,
    `targetUserId` CHAR(36) NULL,
    `category` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `RecommendationFeedback_userId_feedbackKey_key` (`userId`, `feedbackKey`),
    INDEX `RecommendationFeedback_userId_type_createdAt_idx` (`userId`, `type`, `createdAt`),
    INDEX `RecommendationFeedback_category_idx` (`category`),
    PRIMARY KEY (`id`),
    CONSTRAINT `RecommendationFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `RecommendationFeedback_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `RecommendationFeedback_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SuggestedAccountDismissal` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `targetId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `SuggestedAccountDismissal_userId_targetId_key` (`userId`, `targetId`),
    INDEX `SuggestedAccountDismissal_userId_createdAt_idx` (`userId`, `createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SuggestedAccountDismissal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `SuggestedAccountDismissal_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SearchHistory` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `query` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `SearchHistory_userId_createdAt_idx` (`userId`, `createdAt`),
    PRIMARY KEY (`id`),
    CONSTRAINT `SearchHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExternalVideo` (
    `id` CHAR(36) NOT NULL,
    `provider` VARCHAR(24) NOT NULL,
    `providerId` VARCHAR(80) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NULL,
    `creatorName` VARCHAR(200) NOT NULL,
    `creatorUrl` VARCHAR(2048) NOT NULL,
    `embedUrl` VARCHAR(2048) NOT NULL,
    `sourceUrl` VARCHAR(2048) NOT NULL,
    `thumbnailUrl` VARCHAR(2048) NULL,
    `category` VARCHAR(40) NULL,
    `publishedAt` DATETIME(3) NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `ExternalVideo_provider_providerId_key` (`provider`, `providerId`),
    INDEX `ExternalVideo_category_publishedAt_idx` (`category`, `publishedAt`),
    INDEX `ExternalVideo_fetchedAt_idx` (`fetchedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User`
    ADD INDEX `User_displayName_idx` (`displayName`);

ALTER TABLE `Post`
    ADD COLUMN `category` VARCHAR(40) NULL,
    ADD INDEX `Post_category_createdAt_idx` (`category`, `createdAt`);

ALTER TABLE `PostView`
    ADD COLUMN `watchedMs` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `hiddenFromHistory` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `StoryView`
    ADD COLUMN `hiddenFromHistory` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `Story`
    ADD COLUMN `musicTrackId` VARCHAR(40) NULL,
    ADD COLUMN `musicTitle` VARCHAR(200) NULL,
    ADD COLUMN `musicArtist` VARCHAR(200) NULL,
    ADD COLUMN `musicArtworkUrl` VARCHAR(2048) NULL,
    ADD COLUMN `musicPreviewUrl` VARCHAR(2048) NULL,
    ADD COLUMN `musicTrackUrl` VARCHAR(2048) NULL,
    ADD COLUMN `musicStartSeconds` INTEGER NULL,
    ADD COLUMN `musicDurationSeconds` INTEGER NULL,
    ADD COLUMN `musicLabelStyle` VARCHAR(20) NULL,
    ADD COLUMN `musicLabelPosition` VARCHAR(10) NULL,
    ADD COLUMN `musicLabelScale` INTEGER NULL;

ALTER TABLE `DirectMessage`
    ADD COLUMN `kind` ENUM('TEXT', 'SONG', 'STATUS') NOT NULL DEFAULT 'TEXT',
    ADD COLUMN `sharedSongTitle` VARCHAR(200) NULL,
    ADD COLUMN `sharedNote` VARCHAR(240) NULL;

ALTER TABLE `DirectConversation`
    ADD COLUMN `status` ENUM('PENDING', 'ACCEPTED') NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN `requestedById` CHAR(36) NULL;
