import { pgTable, text, timestamp, integer, boolean, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const videoStatusEnum = pgEnum('video_status', ['uploading', 'processing', 'ready', 'failed']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'basic', 'premium']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'expired', 'trial']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'succeeded', 'canceled', 'waiting_for_capture']);

// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
}));

// Categories table
export const categories = pgTable('categories', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  thumbnailKey: varchar('thumbnail_key', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  videos: many(videos),
}));

// Genres table
export const genres = pgTable('genres', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
});

// Videos table
export const videos = pgTable('videos', {
  id: varchar('id', { length: 50 }).primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull().default(''),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  thumbnailKey: varchar('thumbnail_key', { length: 500 }),
  duration: integer('duration').notNull().default(0),
  size: integer('size').notNull().default(0),
  format: varchar('format', { length: 50 }).notNull().default(''),
  codec: varchar('codec', { length: 50 }).notNull().default(''),
  resolutions: jsonb('resolutions').$type<VideoResolution[]>().notNull().default([]),
  status: videoStatusEnum('status').notNull().default('uploading'),
  categoryId: varchar('category_id', { length: 50 }),
  genres: jsonb('genres').$type<string[]>().notNull().default([]),
  uploadedBy: varchar('uploaded_by', { length: 50 }).notNull(),
  isPublic: boolean('is_public').notNull().default(true),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const videosRelations = relations(videos, ({ one }) => ({
  uploader: one(users, {
    fields: [videos.uploadedBy],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
}));

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  plan: subscriptionPlanEnum('plan').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('trial'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  yookassaPaymentMethodId: varchar('yookassa_payment_method_id', { length: 255 }),
  autoRenewal: boolean('auto_renewal').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  payments: many(payments),
}));

// Payments table
export const payments = pgTable('payments', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  subscriptionId: varchar('subscription_id', { length: 50 }),
  yookassaPaymentId: varchar('yookassa_payment_id', { length: 255 }).notNull().unique(),
  amount: integer('amount').notNull(), // Amount in kopecks (1 RUB = 100 kopecks)
  currency: varchar('currency', { length: 3 }).notNull().default('RUB'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, any>>().notNull().default({}),
  confirmationUrl: text('confirmation_url'),
  paid: boolean('paid').notNull().default(false),
  refundable: boolean('refundable').notNull().default(false),
  test: boolean('test').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// Watchlist table (favorites)
export const watchlist = pgTable('watchlist', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  videoId: varchar('video_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [watchlist.videoId],
    references: [videos.id],
  }),
}));

// Watch history table
export const watchHistory = pgTable('watch_history', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  videoId: varchar('video_id', { length: 50 }).notNull(),
  watchedDuration: integer('watched_duration').notNull().default(0), // in seconds
  totalDuration: integer('total_duration').notNull().default(0), // in seconds
  lastWatchedAt: timestamp('last_watched_at').notNull().defaultNow(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [watchHistory.videoId],
    references: [videos.id],
  }),
}));

// Types for inserts and selects
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Watchlist = typeof watchlist.$inferSelect;
export type NewWatchlist = typeof watchlist.$inferInsert;

export type WatchHistory = typeof watchHistory.$inferSelect;
export type NewWatchHistory = typeof watchHistory.$inferInsert;

// Video resolution type (for jsonb field)
export type VideoResolution = {
  quality: string;
  s3Key: string;
  width: number;
  height: number;
  bitrate: number;
  size: number;
};
