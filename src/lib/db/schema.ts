import { pgTable, text, timestamp, integer, boolean, jsonb, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const videoStatusEnum = pgEnum('video_status', ['uploading', 'processing', 'ready', 'failed']);

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

// Types for inserts and selects
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;

// Video resolution type (for jsonb field)
export type VideoResolution = {
  quality: string;
  s3Key: string;
  width: number;
  height: number;
  bitrate: number;
  size: number;
};
