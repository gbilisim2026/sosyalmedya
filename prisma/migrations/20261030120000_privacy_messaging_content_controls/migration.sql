ALTER TABLE `Post`
    ADD COLUMN `audience` ENUM('EVERYONE', 'FOLLOWERS', 'CLOSE_FRIENDS', 'SELECTED') NOT NULL DEFAULT 'EVERYONE',
    ADD COLUMN `isArchived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `allowReshare` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `sharedPostId` CHAR(36) NULL,
    ADD INDEX `Post_userId_isArchived_isPinned_createdAt_idx`(`userId`, `isArchived`, `isPinned`, `createdAt`),
    ADD INDEX `Post_sharedPostId_idx`(`sharedPostId`),
    ADD CONSTRAINT `Post_sharedPostId_fkey` FOREIGN KEY (`sharedPostId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Story`
    ADD COLUMN `audience` ENUM('EVERYONE', 'FOLLOWERS', 'CLOSE_FRIENDS', 'SELECTED') NOT NULL DEFAULT 'EVERYONE';

UPDATE `Post`
SET `mediaUrl` = CONCAT('/media/', SUBSTRING_INDEX(`mediaUrl`, '/', -1))
WHERE `mediaUrl` LIKE '%/uploads/%' OR `mediaUrl` LIKE 'uploads/%';

UPDATE `Story`
SET `mediaUrl` = CONCAT('/media/', SUBSTRING_INDEX(`mediaUrl`, '/', -1))
WHERE `mediaUrl` LIKE '%/uploads/%' OR `mediaUrl` LIKE 'uploads/%';

ALTER TABLE `Notification`
    MODIFY COLUMN `type` ENUM(
        'LIKE', 'COMMENT', 'FOLLOW', 'COMMENT_REPLY', 'FOLLOW_REQUEST',
        'FOLLOW_REQUEST_ACCEPTED', 'FOLLOW_REQUEST_REJECTED', 'MESSAGE', 'RESHARE'
    ) NOT NULL;

ALTER TABLE `StoryView`
    ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 1;

CREATE TABLE `UserBlock` (
    `id` CHAR(36) NOT NULL,
    `blockerId` CHAR(36) NOT NULL,
    `blockedId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `UserBlock_blockerId_blockedId_key`(`blockerId`, `blockedId`),
    INDEX `UserBlock_blockedId_idx`(`blockedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CloseFriend` (
    `id` CHAR(36) NOT NULL,
    `ownerId` CHAR(36) NOT NULL,
    `friendId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `CloseFriend_ownerId_friendId_key`(`ownerId`, `friendId`),
    INDEX `CloseFriend_friendId_idx`(`friendId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PostAudience` (
    `postId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    INDEX `PostAudience_userId_idx`(`userId`),
    PRIMARY KEY (`postId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PostView` (
    `id` CHAR(36) NOT NULL,
    `postId` CHAR(36) NOT NULL,
    `viewerId` CHAR(36) NOT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `PostView_postId_createdAt_idx`(`postId`, `createdAt`),
    UNIQUE INDEX `PostView_postId_viewerId_key`(`postId`, `viewerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StoryAudience` (
    `storyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    INDEX `StoryAudience_userId_idx`(`userId`),
    PRIMARY KEY (`storyId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DirectConversation` (
    `id` CHAR(36) NOT NULL,
    `pairKey` VARCHAR(73) NOT NULL,
    `participantOneId` CHAR(36) NOT NULL,
    `participantTwoId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `DirectConversation_pairKey_key`(`pairKey`),
    INDEX `DirectConversation_participantOneId_updatedAt_idx`(`participantOneId`, `updatedAt`),
    INDEX `DirectConversation_participantTwoId_updatedAt_idx`(`participantTwoId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DirectMessage` (
    `id` CHAR(36) NOT NULL,
    `conversationId` CHAR(36) NOT NULL,
    `senderId` CHAR(36) NOT NULL,
    `content` VARCHAR(4000) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `DirectMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    INDEX `DirectMessage_senderId_isRead_createdAt_idx`(`senderId`, `isRead`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserBlock`
    ADD CONSTRAINT `UserBlock_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `UserBlock_blockedId_fkey` FOREIGN KEY (`blockedId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CloseFriend`
    ADD CONSTRAINT `CloseFriend_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `CloseFriend_friendId_fkey` FOREIGN KEY (`friendId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostAudience`
    ADD CONSTRAINT `PostAudience_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PostAudience_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PostView`
    ADD CONSTRAINT `PostView_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `PostView_viewerId_fkey` FOREIGN KEY (`viewerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StoryAudience`
    ADD CONSTRAINT `StoryAudience_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `StoryAudience_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DirectConversation`
    ADD CONSTRAINT `DirectConversation_participantOneId_fkey` FOREIGN KEY (`participantOneId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `DirectConversation_participantTwoId_fkey` FOREIGN KEY (`participantTwoId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `DirectMessage`
    ADD CONSTRAINT `DirectMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `DirectConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `DirectMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
