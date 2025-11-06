import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { nanoid } from 'nanoid';
import { CategoryRepository, VideoRepository, GenreRepository } from '../lib/db/repositories';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  CategorySchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryListResponseSchema,
  CategoryIdParamSchema,
  GenreListResponseSchema,
} from '../schemas/category.schemas';
import { ErrorSchema } from '../schemas/user.schemas';

const categoryApp = new OpenAPIHono();

// Get all categories (public)
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Categories'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: CategoryListResponseSchema,
        },
      },
      description: 'List of categories',
    },
  },
});

categoryApp.openapi(listCategoriesRoute, async (c) => {
  const categories = await CategoryRepository.findAll();

  return c.json({
    categories: categories.map((cat) => ({
      ...cat,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    })),
  });
});

// Get single category
const getCategoryRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Categories'],
  request: {
    params: CategoryIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: CategorySchema,
        },
      },
      description: 'Category details',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Category not found',
    },
  },
});

categoryApp.openapi(getCategoryRoute, async (c) => {
  const { id } = c.req.valid('param');
  const category = await CategoryRepository.findById(id);

  if (!category) {
    return c.json({ success: false, error: 'Category not found' }, 404);
  }

  return c.json({
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  });
});

// Get videos in category
const getCategoryVideosRoute = createRoute({
  method: 'get',
  path: '/{id}/videos',
  tags: ['Categories'],
  request: {
    params: CategoryIdParamSchema,
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
      description: 'Videos in category',
    },
  },
});

categoryApp.openapi(getCategoryVideosRoute, async (c) => {
  const { id } = c.req.valid('param');
  const videos = await VideoRepository.findByCategory(id);

  // Filter only public and ready videos
  const publicVideos = videos.filter((v) => v.isPublic && v.status === 'ready');

  return c.json({
    videos: publicVideos.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
});

// Create category (admin only)
const createCategoryRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Categories'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategorySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: CategorySchema,
        },
      },
      description: 'Category created',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Creation failed',
    },
  },
});

categoryApp.openapi(
  createCategoryRoute,
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const data = c.req.valid('json');

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const existing = await CategoryRepository.findBySlug(slug);
    if (existing) {
      return c.json({ success: false, error: 'Category with this name already exists' }, 400);
    }

    const category = await CategoryRepository.create({
      id: `cat_${nanoid(10)}`,
      name: data.name,
      slug,
      description: data.description,
    });

    return c.json(
      {
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
      201
    );
  }
);

// Update category (admin only)
const updateCategoryRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Categories'],
  security: [{ Bearer: [] }],
  request: {
    params: CategoryIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCategorySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: CategorySchema,
        },
      },
      description: 'Category updated',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Category not found',
    },
  },
});

categoryApp.openapi(
  updateCategoryRoute,
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');
    const updates: any = c.req.valid('json');

    const category = await CategoryRepository.findById(id);
    if (!category) {
      return c.json({ success: false, error: 'Category not found' }, 404);
    }

    // Update slug if name changed
    if (updates.name) {
      const newSlug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const existing = await CategoryRepository.findBySlug(newSlug);
      if (existing && existing.id !== id) {
        return c.json({ success: false, error: 'Category with this name already exists' }, 400);
      }

      updates.slug = newSlug;
    }

    const updated = await CategoryRepository.update(id, updates);
    if (!updated) {
      return c.json({ success: false, error: 'Failed to update category' }, 500);
    }

    return c.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  }
);

// Delete category (admin only)
const deleteCategoryRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Categories'],
  security: [{ Bearer: [] }],
  request: {
    params: CategoryIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Category deleted',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Category not found',
    },
  },
});

categoryApp.openapi(
  deleteCategoryRoute,
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const { id } = c.req.valid('param');

    const category = await CategoryRepository.findById(id);
    if (!category) {
      return c.json({ success: false, error: 'Category not found' }, 404);
    }

    await CategoryRepository.delete(id);

    return c.json({ success: true, message: 'Category deleted successfully' });
  }
);

// Get all genres (public)
const listGenresRoute = createRoute({
  method: 'get',
  path: '/genres',
  tags: ['Genres'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GenreListResponseSchema,
        },
      },
      description: 'List of genres',
    },
  },
});

categoryApp.openapi(listGenresRoute, async (c) => {
  const genres = await GenreRepository.findAll();

  return c.json({
    genres,
  });
});

export default categoryApp;
