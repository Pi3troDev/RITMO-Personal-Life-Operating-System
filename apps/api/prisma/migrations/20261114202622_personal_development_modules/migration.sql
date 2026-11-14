-- AlterTable
ALTER TABLE `time_entries` ADD COLUMN `bookId` CHAR(36) NULL,
    ADD COLUMN `englishSkill` ENUM('listening', 'reading', 'speaking', 'writing') NULL,
    ADD COLUMN `lessonId` CHAR(36) NULL,
    ADD COLUMN `studyTrackId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `study_tracks` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `kind` ENUM('track', 'course') NOT NULL DEFAULT 'track',
    `status` ENUM('not_started', 'in_progress', 'paused', 'completed') NOT NULL DEFAULT 'not_started',
    `description` TEXT NULL,
    `provider` VARCHAR(80) NULL,
    `url` VARCHAR(500) NULL,
    `weeklyTargetMinutes` INTEGER NULL,
    `startedAt` DATE NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `study_tracks_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_modules` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `trackId` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `study_modules_trackId_position_idx`(`trackId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessons` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `trackId` CHAR(36) NOT NULL,
    `moduleId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `status` ENUM('not_started', 'in_progress', 'done') NOT NULL DEFAULT 'not_started',
    `durationMinutes` INTEGER NULL,
    `notes` TEXT NULL,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `lessons_trackId_position_idx`(`trackId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resources` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `trackId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `type` ENUM('link', 'video', 'article', 'documentation', 'book', 'file', 'other') NOT NULL DEFAULT 'link',
    `url` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resources_userId_trackId_idx`(`userId`, `trackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dev_projects` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('idea', 'planned', 'active', 'paused', 'completed') NOT NULL DEFAULT 'idea',
    `repoUrl` VARCHAR(500) NULL,
    `demoUrl` VARCHAR(500) NULL,
    `stack` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dev_projects_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roadmap_nodes` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `devProjectId` CHAR(36) NOT NULL,
    `parentId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('not_started', 'in_progress', 'done') NOT NULL DEFAULT 'not_started',
    `position` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `roadmap_nodes_devProjectId_position_idx`(`devProjectId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `challenges` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `platform` VARCHAR(60) NULL,
    `url` VARCHAR(500) NULL,
    `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    `status` ENUM('todo', 'in_progress', 'solved', 'abandoned') NOT NULL DEFAULT 'todo',
    `notes` TEXT NULL,
    `solvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `challenges_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notes` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `scope` ENUM('general', 'dev', 'study', 'english', 'reading', 'health', 'spiritual') NOT NULL DEFAULT 'general',
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `tags` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notes_userId_scope_createdAt_idx`(`userId`, `scope`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocabulary_items` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `kind` ENUM('word', 'phrase') NOT NULL DEFAULT 'word',
    `term` VARCHAR(200) NOT NULL,
    `meaning` VARCHAR(500) NOT NULL,
    `example` VARCHAR(500) NULL,
    `status` ENUM('new', 'learning', 'mastered') NOT NULL DEFAULT 'new',
    `tags` JSON NOT NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `lastReviewedAt` DATETIME(3) NULL,
    `nextReviewAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vocabulary_items_userId_status_idx`(`userId`, `status`),
    INDEX `vocabulary_items_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periodic_targets` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `scope` ENUM('study', 'dev', 'english', 'reading', 'health', 'spiritual') NOT NULL,
    `metric` ENUM('time_minutes', 'workout_sessions', 'pages_read', 'bible_chapters', 'vocabulary_items') NOT NULL,
    `targetValue` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `periodic_targets_userId_scope_key`(`userId`, `scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `books` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `goalId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `author` VARCHAR(120) NULL,
    `totalPages` INTEGER NULL,
    `currentPage` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('want_to_read', 'reading', 'finished', 'paused') NOT NULL DEFAULT 'want_to_read',
    `coverUrl` VARCHAR(500) NULL,
    `rating` INTEGER NULL,
    `startedAt` DATE NULL,
    `finishedAt` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `books_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `bookId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `pagesRead` INTEGER NOT NULL,
    `minutes` INTEGER NULL,
    `note` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reading_logs_userId_date_idx`(`userId`, `date`),
    INDEX `reading_logs_bookId_date_idx`(`bookId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book_quotes` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `bookId` CHAR(36) NOT NULL,
    `text` TEXT NOT NULL,
    `page` INTEGER NULL,
    `note` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `book_quotes_bookId_createdAt_idx`(`bookId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_plans` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `weekdays` JSON NOT NULL,
    `exercises` JSON NOT NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workout_plans_userId_archivedAt_idx`(`userId`, `archivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `planId` CHAR(36) NULL,
    `date` DATE NOT NULL,
    `type` ENUM('strength', 'walk', 'cardio', 'other') NOT NULL DEFAULT 'strength',
    `title` VARCHAR(120) NOT NULL,
    `durationMinutes` INTEGER NULL,
    `distanceKm` DOUBLE NULL,
    `effort` INTEGER NULL,
    `notes` TEXT NULL,
    `sets` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workout_logs_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devotionals` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `title` VARCHAR(200) NULL,
    `passage` VARCHAR(200) NULL,
    `reflection` TEXT NOT NULL,
    `application` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `devotionals_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bible_readings` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `book` VARCHAR(60) NOT NULL,
    `chapterFrom` INTEGER NOT NULL,
    `chapterTo` INTEGER NOT NULL,
    `notes` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bible_readings_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prayer_requests` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('active', 'answered', 'archived') NOT NULL DEFAULT 'active',
    `answeredAt` DATETIME(3) NULL,
    `answerNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `prayer_requests_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prayer_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `requestId` CHAR(36) NULL,
    `date` DATE NOT NULL,
    `minutes` INTEGER NULL,
    `notes` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prayer_logs_userId_date_idx`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `time_entries_userId_studyTrackId_localDate_idx` ON `time_entries`(`userId`, `studyTrackId`, `localDate`);

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_studyTrackId_fkey` FOREIGN KEY (`studyTrackId`) REFERENCES `study_tracks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_tracks` ADD CONSTRAINT `study_tracks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_tracks` ADD CONSTRAINT `study_tracks_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_tracks` ADD CONSTRAINT `study_tracks_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_modules` ADD CONSTRAINT `study_modules_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `study_modules` ADD CONSTRAINT `study_modules_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `study_tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `study_tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `study_modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resources` ADD CONSTRAINT `resources_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resources` ADD CONSTRAINT `resources_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `study_tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dev_projects` ADD CONSTRAINT `dev_projects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dev_projects` ADD CONSTRAINT `dev_projects_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dev_projects` ADD CONSTRAINT `dev_projects_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roadmap_nodes` ADD CONSTRAINT `roadmap_nodes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roadmap_nodes` ADD CONSTRAINT `roadmap_nodes_devProjectId_fkey` FOREIGN KEY (`devProjectId`) REFERENCES `dev_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roadmap_nodes` ADD CONSTRAINT `roadmap_nodes_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `roadmap_nodes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `challenges` ADD CONSTRAINT `challenges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes` ADD CONSTRAINT `notes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vocabulary_items` ADD CONSTRAINT `vocabulary_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `periodic_targets` ADD CONSTRAINT `periodic_targets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `books_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `books_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_logs` ADD CONSTRAINT `reading_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_logs` ADD CONSTRAINT `reading_logs_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_quotes` ADD CONSTRAINT `book_quotes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_quotes` ADD CONSTRAINT `book_quotes_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_plans` ADD CONSTRAINT `workout_plans_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_logs` ADD CONSTRAINT `workout_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_logs` ADD CONSTRAINT `workout_logs_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `workout_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devotionals` ADD CONSTRAINT `devotionals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bible_readings` ADD CONSTRAINT `bible_readings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prayer_requests` ADD CONSTRAINT `prayer_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prayer_logs` ADD CONSTRAINT `prayer_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prayer_logs` ADD CONSTRAINT `prayer_logs_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `prayer_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
