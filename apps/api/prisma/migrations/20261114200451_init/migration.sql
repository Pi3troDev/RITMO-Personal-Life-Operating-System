-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `userId` CHAR(36) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
    `locale` VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    `weekStartsOn` INTEGER NOT NULL DEFAULT 1,
    `theme` ENUM('dark', 'light', 'system') NOT NULL DEFAULT 'dark',
    `currency` CHAR(3) NOT NULL DEFAULT 'BRL',
    `dailyCapacityMinutes` INTEGER NOT NULL DEFAULT 360,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userAgent` VARCHAR(255) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_userId_revokedAt_idx`(`userId`, `revokedAt`),
    INDEX `sessions_familyId_idx`(`familyId`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_modules` (
    `userId` CHAR(36) NOT NULL,
    `module` VARCHAR(32) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `module`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `areas` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `color` VARCHAR(32) NOT NULL,
    `icon` VARCHAR(48) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `areas_userId_archivedAt_position_idx`(`userId`, `archivedAt`, `position`),
    UNIQUE INDEX `areas_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `boards` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `boards_userId_isDefault_idx`(`userId`, `isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `board_columns` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `boardId` CHAR(36) NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `statusCategory` ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done') NOT NULL,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `board_columns_boardId_position_idx`(`boardId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('active', 'paused', 'completed', 'archived') NOT NULL DEFAULT 'active',
    `dueDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `projects_userId_status_idx`(`userId`, `status`),
    INDEX `projects_userId_goalId_idx`(`userId`, `goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `boardId` CHAR(36) NOT NULL,
    `columnId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `projectId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done') NOT NULL DEFAULT 'todo',
    `priority` ENUM('none', 'low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'none',
    `position` DOUBLE NOT NULL DEFAULT 0,
    `dueDate` DATE NULL,
    `scheduledStart` DATETIME(3) NULL,
    `estimateMinutes` INTEGER NULL,
    `spentMinutes` INTEGER NOT NULL DEFAULT 0,
    `tags` JSON NOT NULL,
    `checklist` JSON NOT NULL,
    `recurrence` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tasks_userId_status_idx`(`userId`, `status`),
    INDEX `tasks_userId_columnId_position_idx`(`userId`, `columnId`, `position`),
    INDEX `tasks_userId_dueDate_idx`(`userId`, `dueDate`),
    INDEX `tasks_userId_scheduledStart_idx`(`userId`, `scheduledStart`),
    INDEX `tasks_userId_projectId_idx`(`userId`, `projectId`),
    INDEX `tasks_userId_goalId_idx`(`userId`, `goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `start` DATETIME(3) NOT NULL,
    `end` DATETIME(3) NOT NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT false,
    `location` VARCHAR(200) NULL,
    `recurrence` VARCHAR(255) NULL,
    `reminderMinutes` INTEGER NULL,
    `status` ENUM('scheduled', 'done', 'cancelled') NOT NULL DEFAULT 'scheduled',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `events_userId_start_idx`(`userId`, `start`),
    INDEX `events_userId_recurrence_idx`(`userId`, `recurrence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_exceptions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `originalDate` DATE NOT NULL,
    `status` ENUM('scheduled', 'done', 'cancelled') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_exceptions_userId_originalDate_idx`(`userId`, `originalDate`),
    UNIQUE INDEX `event_exceptions_eventId_originalDate_key`(`eventId`, `originalDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_focus_items` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `taskId` CHAR(36) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `daily_focus_items_userId_date_position_idx`(`userId`, `date`, `position`),
    UNIQUE INDEX `daily_focus_items_userId_date_taskId_key`(`userId`, `date`, `taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_reflections` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `accomplished` TEXT NOT NULL,
    `pending` TEXT NOT NULL,
    `learned` TEXT NOT NULL,
    `improve` TEXT NOT NULL,
    `mood` ENUM('great', 'good', 'neutral', 'hard', 'very_hard') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_reflections_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inbox_items` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `kind` ENUM('task', 'idea', 'event', 'expense', 'note', 'goal') NOT NULL,
    `text` VARCHAR(500) NOT NULL,
    `status` ENUM('pending', 'converted', 'discarded') NOT NULL DEFAULT 'pending',
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inbox_items_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `habits` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `name` VARCHAR(80) NOT NULL,
    `weekdays` JSON NOT NULL,
    `suggestedTime` CHAR(5) NULL,
    `targetType` ENUM('check', 'duration', 'quantity') NOT NULL DEFAULT 'check',
    `targetValue` DOUBLE NULL,
    `targetUnit` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `status` ENUM('active', 'paused', 'archived') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `habits_userId_status_idx`(`userId`, `status`),
    INDEX `habits_userId_goalId_idx`(`userId`, `goalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `habit_checkins` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `habitId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('done', 'skipped') NOT NULL,
    `value` DOUBLE NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `habit_checkins_userId_date_idx`(`userId`, `date`),
    UNIQUE INDEX `habit_checkins_habitId_date_key`(`habitId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goals` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `areaId` CHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('financial', 'professional', 'academic', 'intellectual', 'health', 'spiritual', 'personal', 'relationships') NOT NULL,
    `status` ENUM('active', 'paused', 'completed', 'archived') NOT NULL DEFAULT 'active',
    `startDate` DATE NOT NULL,
    `targetDate` DATE NULL,
    `progressMode` ENUM('manual', 'milestones', 'metric') NOT NULL DEFAULT 'manual',
    `manualProgress` DOUBLE NOT NULL DEFAULT 0,
    `metricKind` ENUM('money', 'hours', 'count') NULL,
    `metricTarget` DOUBLE NULL,
    `metricUnit` VARCHAR(20) NULL,
    `metricCurrent` DOUBLE NOT NULL DEFAULT 0,
    `linkedAccountId` CHAR(36) NULL,
    `lastActivityAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `goals_linkedAccountId_key`(`linkedAccountId`),
    INDEX `goals_userId_status_targetDate_idx`(`userId`, `status`, `targetDate`),
    INDEX `goals_userId_category_status_idx`(`userId`, `category`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `milestones` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `goalId` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `dueDate` DATE NULL,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `milestones_goalId_position_idx`(`goalId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goal_progress_entries` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `goalId` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `progress` DOUBLE NOT NULL,

    INDEX `goal_progress_entries_userId_date_idx`(`userId`, `date`),
    UNIQUE INDEX `goal_progress_entries_goalId_date_key`(`goalId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vision_items` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `goalId` CHAR(36) NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('financial', 'professional', 'academic', 'intellectual', 'health', 'spiritual', 'personal', 'relationships') NOT NULL,
    `achieved` BOOLEAN NOT NULL DEFAULT false,
    `position` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vision_items_userId_year_position_idx`(`userId`, `year`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `kind` ENUM('checking', 'cash', 'reserve', 'investment') NOT NULL,
    `isReserved` BOOLEAN NOT NULL DEFAULT false,
    `initialBalanceCents` INTEGER NOT NULL DEFAULT 0,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `accounts_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_categories` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `kind` ENUM('income', 'expense') NOT NULL,
    `icon` VARCHAR(48) NOT NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `finance_categories_userId_kind_name_key`(`userId`, `kind`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `accountId` CHAR(36) NOT NULL,
    `toAccountId` CHAR(36) NULL,
    `categoryId` CHAR(36) NULL,
    `type` ENUM('income', 'expense', 'transfer') NOT NULL,
    `description` VARCHAR(120) NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transactions_userId_date_idx`(`userId`, `date`),
    INDEX `transactions_userId_accountId_date_idx`(`userId`, `accountId`, `date`),
    INDEX `transactions_userId_categoryId_date_idx`(`userId`, `categoryId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `categoryId` CHAR(36) NOT NULL,
    `month` CHAR(7) NOT NULL,
    `limitCents` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_userId_month_idx`(`userId`, `month`),
    UNIQUE INDEX `budgets_userId_categoryId_month_key`(`userId`, `categoryId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_entries` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `kind` ENUM('task', 'study', 'dev', 'english', 'workout', 'reading', 'spiritual', 'other') NOT NULL DEFAULT 'other',
    `source` ENUM('timer', 'manual') NOT NULL DEFAULT 'timer',
    `timerState` ENUM('running', 'paused', 'stopped') NOT NULL DEFAULT 'stopped',
    `title` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,
    `lastResumedAt` DATETIME(3) NULL,
    `durationSeconds` INTEGER NOT NULL DEFAULT 0,
    `localDate` DATE NOT NULL,
    `areaId` CHAR(36) NULL,
    `goalId` CHAR(36) NULL,
    `projectId` CHAR(36) NULL,
    `taskId` CHAR(36) NULL,
    `eventId` CHAR(36) NULL,
    `habitId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `time_entries_userId_localDate_idx`(`userId`, `localDate`),
    INDEX `time_entries_userId_kind_localDate_idx`(`userId`, `kind`, `localDate`),
    INDEX `time_entries_userId_areaId_localDate_idx`(`userId`, `areaId`, `localDate`),
    INDEX `time_entries_userId_goalId_localDate_idx`(`userId`, `goalId`, `localDate`),
    INDEX `time_entries_userId_taskId_idx`(`userId`, `taskId`),
    INDEX `time_entries_userId_timerState_idx`(`userId`, `timerState`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('weekly', 'monthly') NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `status` ENUM('draft', 'completed') NOT NULL DEFAULT 'draft',
    `answers` JSON NOT NULL,
    `priorities` JSON NOT NULL,
    `metrics` JSON NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reviews_userId_type_periodStart_idx`(`userId`, `type`, `periodStart`),
    UNIQUE INDEX `reviews_userId_type_periodStart_key`(`userId`, `type`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('event_reminder', 'task_due', 'habit_reminder', 'weekly_review', 'monthly_review', 'goal_deadline') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(500) NULL,
    `link` VARCHAR(200) NULL,
    `dedupeKey` VARCHAR(160) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    UNIQUE INDEX `notifications_userId_dedupeKey_key`(`userId`, `dedupeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_preferences` (
    `userId` CHAR(36) NOT NULL,
    `eventReminders` BOOLEAN NOT NULL DEFAULT true,
    `taskDue` BOOLEAN NOT NULL DEFAULT true,
    `habitReminders` BOOLEAN NOT NULL DEFAULT true,
    `reviews` BOOLEAN NOT NULL DEFAULT true,
    `goalDeadlines` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `p256dh` VARCHAR(200) NOT NULL,
    `auth` VARCHAR(100) NOT NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `push_subscriptions_userId_endpoint_key`(`userId`, `endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_modules` ADD CONSTRAINT `user_modules_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `areas` ADD CONSTRAINT `areas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `boards` ADD CONSTRAINT `boards_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_columns` ADD CONSTRAINT `board_columns_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `board_columns` ADD CONSTRAINT `board_columns_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_columnId_fkey` FOREIGN KEY (`columnId`) REFERENCES `board_columns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_exceptions` ADD CONSTRAINT `event_exceptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_exceptions` ADD CONSTRAINT `event_exceptions_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_focus_items` ADD CONSTRAINT `daily_focus_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_focus_items` ADD CONSTRAINT `daily_focus_items_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_reflections` ADD CONSTRAINT `daily_reflections_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habits` ADD CONSTRAINT `habits_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habits` ADD CONSTRAINT `habits_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habits` ADD CONSTRAINT `habits_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habit_checkins` ADD CONSTRAINT `habit_checkins_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `habit_checkins` ADD CONSTRAINT `habit_checkins_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `habits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_linkedAccountId_fkey` FOREIGN KEY (`linkedAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goal_progress_entries` ADD CONSTRAINT `goal_progress_entries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goal_progress_entries` ADD CONSTRAINT `goal_progress_entries_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vision_items` ADD CONSTRAINT `vision_items_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vision_items` ADD CONSTRAINT `vision_items_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_categories` ADD CONSTRAINT `finance_categories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `finance_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `finance_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `habits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
