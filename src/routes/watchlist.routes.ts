import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { nanoid } from 'nanoid';
import { z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import {
  AddToWatchlistSchema,
  WatchlistItemSchema,
  WatchlistResponseSchema,
  UpdateWatchHistorySchema,
  WatchHistoryItemSchema,
  WatchHistoryResponseSchema,
  ContinueWatchingResponseSchema,
} from '../schemas/watchlist.schemas';
import { ErrorResponseSchema } from '../schemas/user.schemas';
import { WatchlistRepository, WatchHistoryRepository } from '../lib/db/repositories';

export const watchlistApp = new OpenAPIHono();

// Get user's watchlist
const getWatchlistRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Watchlist'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: WatchlistResponseSchema,
        },
      },
      description: 'Watchlist retrieved successfully',
    },
  },
});

watchlistApp.openapi(getWatchlistRoute, authMiddleware, async (c) => {
  const user = c.get('user');

  const items = await WatchlistRepository.findByUserId(user.userId);
  const total = await WatchlistRepository.countByUserId(user.userId);

  return c.json({ items, total });
});

// Add video to watchlist
const addToWatchlistRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Watchlist'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: AddToWatchlistSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Video added to watchlist',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Video already in watchlist',
    },
  },
});

watchlistApp.openapi(addToWatchlistRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { videoId } = c.req.valid('json');

  // Check if already in watchlist
  const exists = await WatchlistRepository.exists(user.userId, videoId);

  if (exists) {
    return c.json({ success: false, error: 'Video already in watchlist' }, 400);
  }

  // Add to watchlist
  await WatchlistRepository.add({
    id: `wl_${nanoid(10)}`,
    userId: user.userId,
    videoId,
  });

  return c.json({ success: true, message: 'Video added to watchlist' }, 201);
});

// Remove video from watchlist
const removeFromWatchlistRoute = createRoute({
  method: 'delete',
  path: '/{videoId}',
  tags: ['Watchlist'],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      videoId: z.string().openapi({ example: 'vid_abc123' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Video removed from watchlist',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Video not found in watchlist',
    },
  },
});

watchlistApp.openapi(removeFromWatchlistRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { videoId } = c.req.valid('param');

  const removed = await WatchlistRepository.remove(user.userId, videoId);

  if (!removed) {
    return c.json({ success: false, error: 'Video not found in watchlist' }, 404);
  }

  return c.json({ success: true, message: 'Video removed from watchlist' });
});

// Check if video is in watchlist
const checkWatchlistRoute = createRoute({
  method: 'get',
  path: '/{videoId}/check',
  tags: ['Watchlist'],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      videoId: z.string().openapi({ example: 'vid_abc123' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            inWatchlist: z.boolean(),
          }),
        },
      },
      description: 'Watchlist check result',
    },
  },
});

watchlistApp.openapi(checkWatchlistRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { videoId } = c.req.valid('param');

  const exists = await WatchlistRepository.exists(user.userId, videoId);

  return c.json({ inWatchlist: exists });
});

export default watchlistApp;
