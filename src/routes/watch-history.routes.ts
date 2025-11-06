import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { nanoid } from 'nanoid';
import { z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import {
  UpdateWatchHistorySchema,
  WatchHistoryResponseSchema,
  ContinueWatchingResponseSchema,
} from '../schemas/watchlist.schemas';
import { ErrorResponseSchema } from '../schemas/user.schemas';
import { WatchHistoryRepository } from '../lib/db/repositories';

export const watchHistoryApp = new OpenAPIHono();

// Get user's watch history
const getWatchHistoryRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Watch History'],
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      limit: z.string().optional().openapi({ example: '20' }),
      offset: z.string().optional().openapi({ example: '0' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: WatchHistoryResponseSchema,
        },
      },
      description: 'Watch history retrieved successfully',
    },
  },
});

watchHistoryApp.openapi(getWatchHistoryRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { limit, offset } = c.req.valid('query');

  const items = await WatchHistoryRepository.findByUserId(user.userId, {
    limit: limit ? parseInt(limit) : undefined,
    offset: offset ? parseInt(offset) : undefined,
  });

  const total = await WatchHistoryRepository.countByUserId(user.userId);

  return c.json({ items, total });
});

// Update watch history
const updateWatchHistoryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Watch History'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateWatchHistorySchema,
        },
      },
    },
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
      description: 'Watch history updated successfully',
    },
  },
});

watchHistoryApp.openapi(updateWatchHistoryRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { videoId, watchedDuration, totalDuration } = c.req.valid('json');

  // Calculate if video is completed (watched >= 90% or reached the end)
  const completed = watchedDuration >= totalDuration * 0.9 || watchedDuration >= totalDuration;

  await WatchHistoryRepository.upsert({
    id: `wh_${nanoid(10)}`,
    userId: user.userId,
    videoId,
    watchedDuration,
    totalDuration,
    completed,
  });

  return c.json({ success: true, message: 'Watch history updated' });
});

// Get continue watching list
const getContinueWatchingRoute = createRoute({
  method: 'get',
  path: '/continue',
  tags: ['Watch History'],
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      limit: z.string().optional().openapi({ example: '10' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ContinueWatchingResponseSchema,
        },
      },
      description: 'Continue watching list retrieved successfully',
    },
  },
});

watchHistoryApp.openapi(getContinueWatchingRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { limit } = c.req.valid('query');

  const items = await WatchHistoryRepository.getContinueWatching(
    user.userId,
    limit ? parseInt(limit) : 10
  );

  return c.json({ items });
});

// Delete watch history entry
const deleteWatchHistoryRoute = createRoute({
  method: 'delete',
  path: '/{videoId}',
  tags: ['Watch History'],
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
      description: 'Watch history entry deleted',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Watch history entry not found',
    },
  },
});

watchHistoryApp.openapi(deleteWatchHistoryRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { videoId } = c.req.valid('param');

  const deleted = await WatchHistoryRepository.delete(user.userId, videoId);

  if (!deleted) {
    return c.json({ success: false, error: 'Watch history entry not found' }, 404);
  }

  return c.json({ success: true, message: 'Watch history entry deleted' });
});

// Clear all watch history
const clearWatchHistoryRoute = createRoute({
  method: 'delete',
  path: '/',
  tags: ['Watch History'],
  security: [{ Bearer: [] }],
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
      description: 'Watch history cleared',
    },
  },
});

watchHistoryApp.openapi(clearWatchHistoryRoute, authMiddleware, async (c) => {
  const user = c.get('user');

  await WatchHistoryRepository.clearAll(user.userId);

  return c.json({ success: true, message: 'Watch history cleared' });
});

export default watchHistoryApp;
