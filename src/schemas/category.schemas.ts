import { z } from '@hono/zod-openapi';

// Category schema
export const CategorySchema = z.object({
  id: z.string().openapi({ example: 'cat_123abc' }),
  name: z.string().openapi({ example: 'Independent Films' }),
  slug: z.string().openapi({ example: 'independent-films' }),
  description: z.string().optional().openapi({
    example: 'Collection of indie films from local filmmakers',
  }),
  thumbnailKey: z.string().optional().openapi({
    example: 'thumbnails/categories/indie.jpg',
  }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
}).openapi('Category');

// Create category schema
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100).openapi({
    example: 'Independent Films',
    description: 'Category name',
  }),
  description: z.string().max(500).optional().openapi({
    example: 'Collection of indie films from local filmmakers',
  }),
});

// Update category schema
export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
}).openapi('UpdateCategory');

// Category list response
export const CategoryListResponseSchema = z.object({
  categories: z.array(CategorySchema),
}).openapi('CategoryListResponse');

// Category ID param
export const CategoryIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: 'id', in: 'path' },
    example: 'cat_123abc',
  }),
});

// Genre schema
export const GenreSchema = z.object({
  id: z.string().openapi({ example: 'gen_123abc' }),
  name: z.string().openapi({ example: 'Drama' }),
  slug: z.string().openapi({ example: 'drama' }),
}).openapi('Genre');

// Genre list response
export const GenreListResponseSchema = z.object({
  genres: z.array(GenreSchema),
}).openapi('GenreListResponse');
