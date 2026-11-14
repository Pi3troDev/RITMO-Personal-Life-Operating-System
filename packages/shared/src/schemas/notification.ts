import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common';

export const notificationTypeSchema = z.enum([
  'event_reminder',
  'task_due',
  'habit_reminder',
  'weekly_review',
  'monthly_review',
  'goal_deadline',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: idSchema,
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: dateTimeSchema,
});
export type Notification = z.infer<typeof notificationSchema>;

export const listNotificationsQuerySchema = z.object({
  unread: z.stringbool().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const notificationPreferencesSchema = z.object({
  eventReminders: z.boolean(),
  taskDue: z.boolean(),
  habitReminders: z.boolean(),
  reviews: z.boolean(),
  goalDeadlines: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const updateNotificationPreferencesInputSchema = notificationPreferencesSchema.partial();

export const pushSubscriptionInputSchema = z.object({
  endpoint: z.url().max(500),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInputSchema>;
