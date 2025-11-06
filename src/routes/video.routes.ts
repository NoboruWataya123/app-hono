import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { nanoid } from 'nanoid';
import { VideoRepository } from '../lib/db/repositories';
import { S3Service } from '../lib/s3/client';
import { FFmpegService } from '../lib/ffmpeg/wrapper';
import { config } from '../config/env';
import {
  CreateVideoSchema,
  UpdateVideoSchema,
  VideoSchema,
  VideoListResponseSchema,
  VideoListQuerySchema,
  VideoIdParamSchema,
  UploadUrlResponseSchema,
  StreamingUrlResponseSchema,
  ProcessingStatusSchema,
} from '../schemas/video.schemas';
import { ErrorSchema } from '../schemas/user.schemas';
import { authMiddleware } from '../middleware/auth';
import type { VideoResolution } from '../types';

const videoApp = new OpenAPIHono();

// Apply auth middleware to all routes
videoApp.use('/*', authMiddleware);

// Get video list
const listVideosRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    query: VideoListQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: VideoListResponseSchema,
        },
      },
      description: 'List of videos',
    },
  },
});

videoApp.openapi(listVideosRoute, async (c) => {
  const query = c.req.valid('query');
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '20');
  const offset = (page - 1) * limit;

  const { videos: allVideos, total } = await VideoRepository.findAll({
    categoryId: query.categoryId,
    genre: query.genre,
    status: query.status as any,
    search: query.search,
    limit,
    offset,
  });

  let videos = allVideos;

  // Filter out non-public videos for non-admins
  const user = c.get('user');
  if (user.role !== 'admin') {
    videos = videos.filter((v) => v.isPublic || v.uploadedBy === user.userId);
  }

  // Pagination
  const totalPages = Math.ceil(total / limit);

  return c.json({
    videos: videos.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

// Get single video
const getVideoRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    params: VideoIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: VideoSchema,
        },
      },
      description: 'Video details',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Video not found',
    },
  },
});

videoApp.openapi(getVideoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const video = await VideoRepository.findById(id);

  if (!video) {
    return c.json({ success: false, error: 'Video not found' }, 404);
  }

  const user = c.get('user');
  if (!video.isPublic && video.uploadedBy !== user.userId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  // Increment view count
  await VideoRepository.incrementViewCount(id);

  return c.json({
    ...video,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  });
});

// Create video and get upload URL
const createVideoRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateVideoSchema.extend({
            filename: z.string().openapi({ example: 'my-video.mp4' }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: UploadUrlResponseSchema,
        },
      },
      description: 'Video created, upload URL generated',
    },
  },
});

videoApp.openapi(createVideoRoute, async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');

  // Generate S3 key for original video
  const s3Key = S3Service.generateKey('videos/original', data.filename);

  // Create video entry
  const video = await VideoRepository.create({
    id: `vid_${nanoid(10)}`,
    title: data.title,
    description: data.description || '',
    originalFilename: data.filename,
    s3Key,
    duration: 0,
    size: 0,
    format: '',
    codec: '',
    resolutions: [],
    status: 'uploading',
    categoryId: data.categoryId,
    genres: data.genres || [],
    uploadedBy: user.userId,
    isPublic: data.isPublic ?? true,
    viewCount: 0,
  });

  // Generate presigned upload URL
  const uploadUrl = S3Service.presignUrl(s3Key, {
    method: 'PUT',
    expiresIn: 3600, // 1 hour
  });

  return c.json(
    {
      uploadUrl,
      videoId: video.id,
      expiresIn: 3600,
    },
    201
  );
});

// Update video metadata
const updateVideoRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    params: VideoIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateVideoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: VideoSchema,
        },
      },
      description: 'Video updated',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Video not found',
    },
  },
});

videoApp.openapi(updateVideoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const updates = c.req.valid('json');
  const user = c.get('user');

  const video = await VideoRepository.findById(id);
  if (!video) {
    return c.json({ success: false, error: 'Video not found' }, 404);
  }

  // Check permissions
  if (video.uploadedBy !== user.userId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  const updated = await VideoRepository.update(id, updates);
  if (!updated) {
    return c.json({ success: false, error: 'Failed to update video' }, 500);
  }

  return c.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

// Delete video
const deleteVideoRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    params: VideoIdParamSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Video deleted',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Video not found',
    },
  },
});

videoApp.openapi(deleteVideoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const user = c.get('user');

  const video = await VideoRepository.findById(id);
  if (!video) {
    return c.json({ success: false, error: 'Video not found' }, 404);
  }

  // Check permissions
  if (video.uploadedBy !== user.userId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  // Delete from S3
  const keysToDelete = [
    video.s3Key,
    ...video.resolutions.map((r: any) => r.s3Key),
    ...(video.thumbnailKey ? [video.thumbnailKey] : []),
  ];

  try {
    await S3Service.deleteMultiple(keysToDelete);
  } catch (error) {
    console.error('Failed to delete S3 files:', error);
  }

  // Delete from database
  await VideoRepository.delete(id);

  return c.json({ success: true, message: 'Video deleted successfully' });
});

// Get streaming URL
const getStreamingUrlRoute = createRoute({
  method: 'get',
  path: '/{id}/stream',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    params: VideoIdParamSchema,
    query: z.object({
      quality: z.string().optional().openapi({
        param: { name: 'quality', in: 'query' },
        example: '720p',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: StreamingUrlResponseSchema,
        },
      },
      description: 'Streaming URL generated',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: 'Video not found',
    },
  },
});

videoApp.openapi(getStreamingUrlRoute, async (c) => {
  const { id } = c.req.valid('param');
  const { quality } = c.req.valid('query');
  const user = c.get('user');

  const video = await VideoRepository.findById(id);
  if (!video) {
    return c.json({ success: false, error: 'Video not found' }, 404);
  }

  // Check permissions
  if (!video.isPublic && video.uploadedBy !== user.userId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  if (video.status !== 'ready') {
    return c.json({ success: false, error: 'Video is not ready for streaming' }, 400);
  }

  // Find requested quality or use original
  let s3Key = video.s3Key;
  let selectedQuality = 'original';

  if (quality && video.resolutions.length > 0) {
    const resolution = video.resolutions.find((r) => r.quality === quality);
    if (resolution) {
      s3Key = resolution.s3Key;
      selectedQuality = quality;
    }
  }

  // Generate presigned URL
  const streamingUrl = S3Service.presignUrl(s3Key, {
    method: 'GET',
    expiresIn: 3600, // 1 hour
  });

  return c.json({
    streamingUrl,
    quality: selectedQuality,
    expiresIn: 3600,
  });
});

// Trigger video processing (webhook/callback after upload)
const processVideoRoute = createRoute({
  method: 'post',
  path: '/{id}/process',
  tags: ['Videos'],
  security: [{ Bearer: [] }],
  request: {
    params: VideoIdParamSchema,
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Processing started',
    },
  },
});

videoApp.openapi(processVideoRoute, async (c) => {
  const { id } = c.req.valid('param');
  const user = c.get('user');

  const video = await VideoRepository.findById(id);
  if (!video) {
    return c.json({ success: false, error: 'Video not found' }, 404);
  }

  // Check permissions
  if (video.uploadedBy !== user.userId && user.role !== 'admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  // Start processing in background (simplified - in production use a job queue)
  processVideoInBackground(id).catch((error) => {
    console.error(`Failed to process video ${id}:`, error);
    VideoRepository.update(id, { status: 'failed' });
  });

  await VideoRepository.update(id, { status: 'processing' });

  return c.json(
    {
      success: true,
      message: 'Video processing started',
    },
    202
  );
});

// Background video processing function
async function processVideoInBackground(videoId: string) {
  const video = await VideoRepository.findById(videoId);
  if (!video) return;

  try {
    // Download original video from S3
    const tempDir = config.TEMP_UPLOAD_DIR;
    const inputPath = `${tempDir}/${videoId}-original.mp4`;
    const videoData = await S3Service.download(video.s3Key);

    // Save to temp file
    await Bun.write(inputPath, videoData);

    // Get video metadata
    const metadata = await FFmpegService.getMetadata(inputPath);

    // Update video with metadata
    await VideoRepository.update(videoId, {
      duration: metadata.duration,
      format: metadata.format,
      codec: metadata.codec,
    });

    // Generate thumbnail
    const thumbnailPath = `${tempDir}/${videoId}-thumb.jpg`;
    await FFmpegService.generateThumbnail({
      inputPath,
      outputPath: thumbnailPath,
    });

    const thumbnailKey = S3Service.generateKey('thumbnails', `${videoId}.jpg`);
    await S3Service.upload(thumbnailKey, await Bun.file(thumbnailPath).arrayBuffer(), {
      contentType: 'image/jpeg',
    });

    // Transcode to multiple qualities
    const qualities = config.VIDEO_QUALITY_LEVELS.split(',');
    const resolutions: VideoResolution[] = [];

    for (const quality of qualities) {
      const outputPath = `${tempDir}/${videoId}-${quality}.mp4`;

      await FFmpegService.transcode({
        inputPath,
        outputPath,
        quality,
        codec: config.DEFAULT_VIDEO_CODEC as 'av1' | 'h264' | 'h265',
      });

      // Upload to S3
      const s3Key = S3Service.generateKey(`videos/${quality}`, `${videoId}.mp4`);
      await S3Service.upload(s3Key, await Bun.file(outputPath).arrayBuffer(), {
        contentType: 'video/mp4',
      });

      // Get file stats
      const stat = await Bun.file(outputPath).stat();
      const resolution = getResolutionDimensions(quality);

      resolutions.push({
        quality,
        s3Key,
        width: resolution.width,
        height: resolution.height,
        bitrate: 0, // Would need to parse from ffmpeg output
        size: stat.size,
      });

      // Clean up temp file
      await Bun.write(outputPath, ''); // Clear file content
    }

    // Update video status
    await VideoRepository.update(videoId, {
      status: 'ready',
      thumbnailKey,
      resolutions,
    });

    // Clean up temp files
    await Bun.write(inputPath, '');
    await Bun.write(thumbnailPath, '');
  } catch (error) {
    console.error('Video processing error:', error);
    await VideoRepository.update(videoId, { status: 'failed' });
  }
}

function getResolutionDimensions(quality: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    '360p': { width: 640, height: 360 },
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
  };
  return map[quality] || { width: 1920, height: 1080 };
}

export default videoApp;
