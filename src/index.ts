import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config/env';

// Import routes
import authRoutes from './routes/auth.routes';
import videoRoutes from './routes/video.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';
import watchlistRoutes from './routes/watchlist.routes';
import watchHistoryRoutes from './routes/watch-history.routes';

/**
 * Main application instance
 */
const app = new OpenAPIHono();

// Register security scheme
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your JWT token',
});

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Regional Streaming Service API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    docs: '/docs',
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/videos', videoRoutes);
app.route('/api/users', userRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/webhooks', webhookRoutes);
app.route('/api/watchlist', watchlistRoutes);
app.route('/api/watch-history', watchHistoryRoutes);

// OpenAPI documentation
app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'Regional Streaming Service API',
    version: '1.0.0',
    description: `
# Regional Streaming Service API

A modern video streaming platform focused on regional and independent films.

## Features

- **AV1 Video Encoding**: Next-generation video codec for efficient streaming
- **Multiple Quality Levels**: Adaptive streaming with 360p, 480p, 720p, 1080p
- **S3 Storage**: Scalable cloud storage for videos and thumbnails
- **User Authentication**: JWT-based authentication system
- **Video Management**: Upload, transcode, and manage video content
- **Categories & Genres**: Organize content effectively
- **Streaming URLs**: Presigned URLs for secure video streaming
- **Subscriptions**: YooKassa-powered billing with free, basic, and premium plans
- **Watchlist**: Add videos to favorites for later watching
- **Watch History**: Track viewing progress and continue watching
- **Payment Webhooks**: Real-time payment status updates

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

Get your token by registering or logging in via the /api/auth endpoints.

## Subscriptions

The platform offers three subscription tiers:
- **Free**: Basic access to content
- **Basic**: 299 RUB/month - Enhanced features
- **Premium**: 599 RUB/month - Full access to all content

Payments are processed through YooKassa payment gateway.
    `,
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}`,
      description: 'Development server',
    },
  ],
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/api/openapi.json' }));

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
      message: 'The requested resource does not exist',
      path: c.req.path,
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);

  return c.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
});

// Start server
const port = parseInt(config.PORT);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎬 Regional Streaming Service API                         ║
║                                                              ║
║   Server running on: http://localhost:${port.toString().padEnd(29)}║
║   API Documentation: http://localhost:${port}/docs${' '.repeat(18)}║
║   OpenAPI Spec:      http://localhost:${port}/api/openapi.json${' '.repeat(4)}║
║                                                              ║
║   Environment: ${config.NODE_ENV.padEnd(48)}║
║   Video Codec: ${config.DEFAULT_VIDEO_CODEC.padEnd(48)}║
║   S3 Bucket:   ${config.S3_BUCKET.padEnd(48)}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
