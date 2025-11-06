import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { UserRepository, VideoRepository } from '../lib/db/repositories';
import { authMiddleware } from '../middleware/auth';
import {
  UserSchema,
  UpdateUserSchema,
  ErrorSchema,
} from '../schemas/user.schemas';

const userApp = new OpenAPIHono();

// Apply auth middleware to all routes
userApp.use('/*', authMiddleware);

// Get user profile
const getUserRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Users'],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        param: { name: 'id', in: 'path' },
        example: 'usr_123abc',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
      description: 'User profile',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'User not found',
    },
  },
});

userApp.openapi(getUserRoute, async (c) => {
  const { id } = c.req.valid('param');
  const user = await UserRepository.findById(id);

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  const { passwordHash: _, ...userWithoutPassword } = user;

  return c.json({
    ...userWithoutPassword,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
});

// Update current user
const updateUserRoute = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['Users'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSchema,
        },
      },
      description: 'User updated',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Update failed',
    },
  },
});

userApp.openapi(updateUserRoute, async (c) => {
  const updates = c.req.valid('json');
  const userPayload = c.get('user');

  // Check if username is already taken
  if (updates.username) {
    const existing = await UserRepository.findByUsername(updates.username);
    if (existing && existing.id !== userPayload.userId) {
      return c.json({ success: false, error: 'Username already taken' }, 400);
    }
  }

  // Check if email is already taken
  if (updates.email) {
    const existing = await UserRepository.findByEmail(updates.email);
    if (existing && existing.id !== userPayload.userId) {
      return c.json({ success: false, error: 'Email already registered' }, 400);
    }
  }

  const updated = await UserRepository.update(userPayload.userId, updates);
  if (!updated) {
    return c.json({ success: false, error: 'Failed to update user' }, 500);
  }

  const { passwordHash: _, ...userWithoutPassword } = updated;

  return c.json({
    ...userWithoutPassword,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Get user's videos
const getUserVideosRoute = createRoute({
  method: 'get',
  path: '/{id}/videos',
  tags: ['Users'],
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        param: { name: 'id', in: 'path' },
        example: 'usr_123abc',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            videos: z.array(z.any()),
          }),
        },
      },
      description: 'User videos',
    },
  },
});

userApp.openapi(getUserVideosRoute, async (c) => {
  const { id } = c.req.valid('param');
  const currentUser = c.get('user');

  let videos = await VideoRepository.findByUser(id);

  // Filter private videos if not owner or admin
  if (id !== currentUser.userId && currentUser.role !== 'admin') {
    videos = videos.filter((v) => v.isPublic);
  }

  return c.json({
    videos: videos.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
});

export default userApp;
