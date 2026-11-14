-- AlterTable
ALTER TABLE `prayer_logs` ADD COLUMN `timeEntryId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `reading_logs` ADD COLUMN `timeEntryId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `workout_logs` ADD COLUMN `timeEntryId` CHAR(36) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `prayer_logs_timeEntryId_key` ON `prayer_logs`(`timeEntryId`);

-- CreateIndex
CREATE UNIQUE INDEX `reading_logs_timeEntryId_key` ON `reading_logs`(`timeEntryId`);

-- CreateIndex
CREATE UNIQUE INDEX `workout_logs_timeEntryId_key` ON `workout_logs`(`timeEntryId`);

