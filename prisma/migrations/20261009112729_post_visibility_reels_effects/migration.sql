-- AlterTable
ALTER TABLE `post` ADD COLUMN `isReel` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `visibility` ENUM('PUBLIC', 'FOLLOWERS_ONLY') NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN `visualEffect` ENUM('NONE', 'FADE', 'ZOOM', 'SLIDE', 'BOUNCE') NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE `story` ADD COLUMN `visualEffect` ENUM('NONE', 'FADE', 'ZOOM', 'SLIDE', 'BOUNCE') NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX `Post_visibility_createdAt_idx` ON `Post`(`visibility`, `createdAt`);

-- CreateIndex
CREATE INDEX `Post_isReel_createdAt_idx` ON `Post`(`isReel`, `createdAt`);
