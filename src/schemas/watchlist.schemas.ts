import { z } from '@hono/zod-openapi';
import { VideoSchema } from './video.schemas';

// Add to watchlist request
export const AddToWatchlistSchema = z
  .object({
    videoId: z.string().openapi({ example: 'vid_abc123' }),
  })
  .openapi('AddToWatchlist');

// Watchlist item schema
export const WatchlistItemSchema = z
  .object({
    id: z.string().openapi({ example: 'wl_abc123' }),
    videoId: z.string().openapi({ example: 'vid_abc123' }),
    addedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
    video: VideoSchema,
  })
  .openapi('WatchlistItem');

// Watchlist response
export const WatchlistResponseSchema = z
  .object({
    items: z.array(WatchlistItemSchema),
    total: z.number().openapi({ example: 10 }),
  })
  .openapi('WatchlistResponse');

// Watch history update request
export const UpdateWatchHistorySchema = z
  .object({
    videoId: z.string().openapi({ example: 'vid_abc123' }),
    watchedDuration: z.number().min(0).openapi({
      example: 1200,
      description: 'Watched duration in seconds',
    }),
    totalDuration: z.number().min(0).openapi({
      example: 3600,
      description: 'Total video duration in seconds',
    }),
  })
  .openapi('UpdateWatchHistory');

// Watch history item schema
export const WatchHistoryItemSchema = z
  .object({
    id: z.string().openapi({ example: 'wh_abc123' }),
    videoId: z.string().openapi({ example: 'vid_abc123' }),
    watchedDuration: z.number().openapi({ example: 1200 }),
    totalDuration: z.number().openapi({ example: 3600 }),
    progress: z.number().openapi({
      example: 1200,
      description: 'Same as watchedDuration, kept for compatibility',
    }),
    completed: z.boolean().openapi({ example: false }),
    lastWatchedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
    video: VideoSchema,
  })
  .openapi('WatchHistoryItem');

// Watch history response
export const WatchHistoryResponseSchema = z
  .object({
    items: z.array(WatchHistoryItemSchema),
    total: z.number().openapi({ example: 10 }),
  })
  .openapi('WatchHistoryResponse');

// Continue watching response
export const ContinueWatchingResponseSchema = z
  .object({
    items: z.array(WatchHistoryItemSchema),
  })
  .openapi('ContinueWatchingResponse');
