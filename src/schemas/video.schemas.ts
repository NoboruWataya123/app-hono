import { z } from '@hono/zod-openapi';

// Video Resolution schema
export const VideoResolutionSchema = z.object({
  quality: z.string().openapi({ example: '720p' }),
  s3Key: z.string().openapi({ example: 'videos/123/720p.mp4' }),
  width: z.number().openapi({ example: 1280 }),
  height: z.number().openapi({ example: 720 }),
  bitrate: z.number().openapi({ example: 2500000 }),
  size: z.number().openapi({ example: 52428800 }),
}).openapi('VideoResolution');

// Video schema
export const VideoSchema = z.object({
  id: z.string().openapi({ example: 'vid_123abc' }),
  title: z.string().openapi({ example: 'Amazing Indie Film' }),
  description: z.string().openapi({ example: 'A captivating story about...' }),
  originalFilename: z.string().openapi({ example: 'my-film.mp4' }),
  s3Key: z.string().openapi({ example: 'videos/original/123abc.mp4' }),
  thumbnailKey: z.string().optional().openapi({ example: 'thumbnails/123abc.jpg' }),
  duration: z.number().openapi({ example: 7200, description: 'Duration in seconds' }),
  size: z.number().openapi({ example: 1073741824, description: 'File size in bytes' }),
  format: z.string().openapi({ example: 'mp4' }),
  codec: z.string().openapi({ example: 'av1' }),
  resolutions: z.array(VideoResolutionSchema).openapi({
    description: 'Available quality versions',
  }),
  status: z.enum(['uploading', 'processing', 'ready', 'failed']).openapi({
    example: 'ready',
    description: 'Video processing status',
  }),
  categoryId: z.string().optional().openapi({ example: 'cat_123' }),
  genres: z.array(z.string()).openapi({
    example: ['drama', 'thriller'],
    description: 'Video genres',
  }),
  uploadedBy: z.string().openapi({ example: 'usr_123abc' }),
  isPublic: z.boolean().openapi({ example: true }),
  viewCount: z.number().openapi({ example: 1500 }),
  createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
}).openapi('Video');

// Create video schema
export const CreateVideoSchema = z.object({
  title: z.string().min(1).max(200).openapi({
    example: 'Amazing Indie Film',
    description: 'Video title',
  }),
  description: z.string().max(5000).optional().openapi({
    example: 'A captivating story about...',
    description: 'Video description',
  }),
  categoryId: z.string().optional().openapi({
    example: 'cat_123',
  }),
  genres: z.array(z.string()).optional().default([]).openapi({
    example: ['drama', 'thriller'],
  }),
  isPublic: z.boolean().optional().default(true).openapi({
    example: true,
  }),
});

// Update video schema
export const UpdateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  categoryId: z.string().optional(),
  genres: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
}).openapi('UpdateVideo');

// Upload URL response
export const UploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url().openapi({
    example: 'https://s3.amazonaws.com/bucket/video.mp4?signature=...',
    description: 'Presigned URL for uploading video',
  }),
  videoId: z.string().openapi({
    example: 'vid_123abc',
    description: 'ID of the created video entry',
  }),
  expiresIn: z.number().openapi({
    example: 3600,
    description: 'URL expiration time in seconds',
  }),
}).openapi('UploadUrlResponse');

// Video list query params
export const VideoListQuerySchema = z.object({
  page: z.string().optional().default('1').openapi({
    param: { name: 'page', in: 'query' },
    example: '1',
  }),
  limit: z.string().optional().default('20').openapi({
    param: { name: 'limit', in: 'query' },
    example: '20',
  }),
  categoryId: z.string().optional().openapi({
    param: { name: 'categoryId', in: 'query' },
    example: 'cat_123',
  }),
  genre: z.string().optional().openapi({
    param: { name: 'genre', in: 'query' },
    example: 'drama',
  }),
  search: z.string().optional().openapi({
    param: { name: 'search', in: 'query' },
    example: 'indie',
  }),
  status: z.enum(['uploading', 'processing', 'ready', 'failed']).optional().openapi({
    param: { name: 'status', in: 'query' },
    example: 'ready',
  }),
});

// Video list response
export const VideoListResponseSchema = z.object({
  videos: z.array(VideoSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
}).openapi('VideoListResponse');

// Streaming URL response
export const StreamingUrlResponseSchema = z.object({
  streamingUrl: z.string().url().openapi({
    example: 'https://s3.amazonaws.com/bucket/video.mp4?signature=...',
  }),
  quality: z.string().openapi({ example: '720p' }),
  expiresIn: z.number().openapi({ example: 3600 }),
}).openapi('StreamingUrlResponse');

// Video ID param
export const VideoIdParamSchema = z.object({
  id: z.string().openapi({
    param: { name: 'id', in: 'path' },
    example: 'vid_123abc',
  }),
});

// Processing status response
export const ProcessingStatusSchema = z.object({
  videoId: z.string().openapi({ example: 'vid_123abc' }),
  status: z.enum(['uploading', 'processing', 'ready', 'failed']).openapi({
    example: 'processing',
  }),
  progress: z.number().min(0).max(100).openapi({
    example: 65,
    description: 'Processing progress percentage',
  }),
  currentStep: z.string().optional().openapi({
    example: 'Transcoding to 720p',
  }),
  error: z.string().optional().openapi({
    example: 'Failed to transcode video',
  }),
}).openapi('ProcessingStatus');
