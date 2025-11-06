# 🏗️ API Architecture Documentation

## Overview

This document describes the architecture of the Regional Streaming Service backend API.

## Technology Stack

- **Framework**: Hono.js (Ultra-fast web framework)
- **Validation**: Zod with OpenAPI integration
- **Storage**: S3-compatible (AWS S3, Cloudflare R2, MinIO)
- **Video Processing**: FFmpeg (CLI wrapper)
- **Authentication**: JWT with bcrypt
- **Runtime**: Node.js (designed for Bun migration)

## Architecture Principles

### 1. Modular Design

Each feature is organized into its own domain:
```
routes/      - HTTP handlers and route definitions
schemas/     - Zod validation schemas
lib/         - Business logic and external services
middleware/  - Cross-cutting concerns (auth, etc.)
utils/       - Helper functions
```

### 2. Type Safety

- Zod schemas provide runtime validation
- TypeScript provides compile-time type checking
- OpenAPI specs generated from Zod schemas
- Full type inference in route handlers

### 3. Best Practices for Hono

#### ✅ Direct Handler Definitions

```typescript
// GOOD: Type inference works
app.openapi(route, (c) => {
  const { id } = c.req.valid('param') // Type: string
  return c.json(result)
})

// BAD: Type inference broken
const controller = (c: Context) => {
  const id = c.req.param('id') // Type: any
}
app.get('/route/:id', controller)
```

#### ✅ OpenAPI-First Design

All routes defined using `createRoute` from `@hono/zod-openapi`:
- Automatic validation
- Type inference
- OpenAPI spec generation
- Interactive documentation

## Data Flow

### Video Upload Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │─────1──>│   API   │─────2──>│   S3    │
│         │<────3───│         │         │         │
└─────────┘         └─────────┘         └─────────┘
                         │
                         4
                         ↓
                    ┌─────────┐
                    │ FFmpeg  │
                    │Processing│
                    └─────────┘
                         │
                         5
                         ↓
                    ┌─────────┐
                    │   S3    │
                    │(Multiple│
                    │Qualities)│
                    └─────────┘
```

1. **Request Upload**: Client requests presigned upload URL
2. **Generate URL**: API generates presigned S3 URL
3. **Return URL**: Client receives URL and uploads directly to S3
4. **Process**: Client triggers processing via API
5. **Transcode**: FFmpeg transcodes to multiple resolutions and uploads to S3

### Authentication Flow

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │────1───>│   API   │────2───>│   DB    │
│         │<───3────│         │<───4────│         │
│         │         │         │         │         │
│         │────5───>│  Auth   │         │         │
│         │         │Middleware│        │         │
│         │<───6────│         │         │         │
└─────────┘         └─────────┘         └─────────┘
```

1. **Login Request**: Client sends credentials
2. **Verify**: API checks credentials against DB
3. **Return Token**: API returns JWT token
4. **DB Response**: User data retrieved
5. **Authenticated Request**: Client sends token in header
6. **Response**: Middleware validates token, allows access

## API Endpoints

### Authentication (`/api/auth`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/register` | POST | No | Register new user |
| `/login` | POST | No | Login and get JWT |
| `/me` | GET | Yes | Get current user |

### Videos (`/api/videos`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | Yes | List videos (with filters) |
| `/` | POST | Yes | Create video, get upload URL |
| `/:id` | GET | Yes | Get video details |
| `/:id` | PATCH | Yes | Update video metadata |
| `/:id` | DELETE | Yes | Delete video |
| `/:id/stream` | GET | Yes | Get streaming URL |
| `/:id/process` | POST | Yes | Trigger processing |

### Users (`/api/users`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/:id` | GET | Yes | Get user profile |
| `/me` | PATCH | Yes | Update current user |
| `/:id/videos` | GET | Yes | Get user's videos |

### Categories (`/api/categories`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | No | List all categories |
| `/` | POST | Admin | Create category |
| `/:id` | GET | No | Get category |
| `/:id` | PATCH | Admin | Update category |
| `/:id` | DELETE | Admin | Delete category |
| `/:id/videos` | GET | No | Get category videos |
| `/genres` | GET | No | List all genres |

## Security

### Authentication

- **JWT Tokens**: Issued on login, validated on protected routes
- **Password Hashing**: bcrypt with salt rounds of 10
- **Token Expiration**: Configurable via `JWT_EXPIRES_IN` (default 7 days)

### Authorization

- **Role-based**: `admin` and `user` roles
- **Resource ownership**: Users can only modify their own videos
- **Admin privileges**: Admins can modify all resources

### S3 Security

- **Presigned URLs**: Time-limited access without exposing credentials
- **Separate buckets**: Original, processed, and thumbnails can use different buckets
- **ACL Control**: Configurable access control lists

## Video Processing

### FFmpeg Wrapper

Located in `src/lib/ffmpeg/wrapper.ts`

Features:
- **Metadata extraction**: Duration, resolution, codec info
- **Transcoding**: Multiple quality levels with AV1/H.264/H.265
- **Thumbnail generation**: Extract frames for preview
- **Progress tracking**: Monitor encoding progress
- **Error handling**: Graceful failure with detailed errors

### Supported Codecs

- **AV1** (default): Best compression, slower encoding
- **H.265/HEVC**: Good compression, moderate speed
- **H.264/AVC**: Wide compatibility, fast encoding

### Quality Levels

Configurable via `VIDEO_QUALITY_LEVELS`:
- 360p: 640x360
- 480p: 854x480
- 720p: 1280x720
- 1080p: 1920x1080

## S3 Integration

### Bun S3 Client

Located in `src/lib/s3/client.ts`

Features:
- **Fast native bindings**: Uses Bun's optimized S3 implementation
- **Presigned URLs**: For uploads and downloads
- **Streaming**: Direct streaming without loading into memory
- **Multipart uploads**: Automatic for large files
- **Provider agnostic**: Works with any S3-compatible service

### Supported Providers

- AWS S3
- Cloudflare R2
- DigitalOcean Spaces
- MinIO
- Backblaze B2
- Google Cloud Storage (S3 compatible)
- Supabase Storage

## Database

### Current: In-Memory Store

Located in `src/lib/db/store.ts`

- Simple Map-based storage
- Good for development and testing
- **Not suitable for production**

### Collections

- **Users**: Authentication and profiles
- **Videos**: Video metadata and processing status
- **Categories**: Content organization
- **Genres**: Predefined genre list

### Production Migration

Recommended: **PostgreSQL with Prisma**

```typescript
// Example schema
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  username      String   @unique
  passwordHash  String
  role          Role     @default(USER)
  videos        Video[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Video {
  id               String          @id @default(cuid())
  title            String
  description      String
  s3Key            String
  thumbnailKey     String?
  status           VideoStatus
  resolutions      Resolution[]
  category         Category?       @relation(fields: [categoryId], references: [id])
  categoryId       String?
  user             User            @relation(fields: [uploadedBy], references: [id])
  uploadedBy       String
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}
```

## Error Handling

### Standard Error Response

```typescript
{
  success: false,
  error: "Error message",
  code?: "ERROR_CODE"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Validation Errors

Zod validation errors are caught and returned with details:

```typescript
{
  success: false,
  error: "Validation failed",
  details: [
    {
      field: "email",
      message: "Invalid email format"
    }
  ]
}
```

## Environment Configuration

### Required Variables

```env
JWT_SECRET          # Must be 32+ characters
S3_ACCESS_KEY_ID    # S3 credentials
S3_SECRET_ACCESS_KEY
S3_BUCKET           # Bucket name
```

### Optional Variables

```env
PORT=3000
NODE_ENV=development
S3_REGION=us-east-1
S3_ENDPOINT         # For non-AWS providers
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
VIDEO_QUALITY_LEVELS=360p,480p,720p,1080p
DEFAULT_VIDEO_CODEC=av1
TEMP_UPLOAD_DIR=/tmp/uploads
CORS_ORIGIN=http://localhost:3001
```

## Performance Considerations

### Video Processing

- **Background processing**: Don't block the upload response
- **Job queue**: Use Bull/BullMQ for production
- **Parallel transcoding**: Process multiple qualities simultaneously
- **Cleanup**: Delete temporary files after processing

### S3 Operations

- **Direct upload**: Client uploads directly to S3
- **Presigned URLs**: Avoid proxying large files through API
- **Streaming**: Use S3 streaming for downloads
- **Multipart uploads**: Automatic for files > 5MB

### Caching

Future improvements:
- Cache presigned URLs (with expiration)
- Cache video metadata
- CDN for video delivery

## Scalability

### Horizontal Scaling

- **Stateless API**: No session state, easy to scale
- **S3 storage**: Unlimited scalability
- **Job processing**: Separate video processing workers

### Future Enhancements

1. **Database**: PostgreSQL with read replicas
2. **Cache**: Redis for sessions and metadata
3. **CDN**: CloudFront/Cloudflare for video delivery
4. **Queue**: RabbitMQ/SQS for job processing
5. **Search**: Elasticsearch for video search
6. **Analytics**: Video view tracking and analytics

## Testing

### Recommended Tools

- **Unit tests**: Bun test or Vitest
- **Integration tests**: Supertest or Hono's test client
- **E2E tests**: Playwright or Cypress

### Test Structure

```typescript
import { describe, it, expect } from 'bun:test';

describe('Video API', () => {
  it('should create video and return upload URL', async () => {
    const res = await app.request('/api/videos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Video',
        filename: 'test.mp4',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.uploadUrl).toBeDefined();
  });
});
```

## Monitoring

### Recommended Tools

- **APM**: New Relic, Datadog, or Sentry
- **Logging**: Winston or Pino
- **Metrics**: Prometheus + Grafana

### Key Metrics

- Request rate and latency
- Video processing time
- S3 upload/download speed
- Error rates
- User registrations and logins
- Video views and streams

## Deployment

### Recommended Platforms

1. **Bun on VPS** (DigitalOcean, Linode, Hetzner)
2. **Cloudflare Workers** (with Bun)
3. **Fly.io** (Supports Bun)
4. **Railway** (Node.js/Bun)
5. **AWS ECS/Fargate**

### Docker Deployment

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production

COPY . .

EXPOSE 3000

CMD ["bun", "run", "start"]
```

### Environment Variables

Use secrets management:
- **AWS**: Secrets Manager
- **Docker**: Docker secrets
- **Kubernetes**: Secrets
- **Cloudflare**: Environment variables

## API Versioning

Future consideration for breaking changes:

```typescript
// v1 routes
app.route('/api/v1/videos', videosV1);

// v2 routes (with breaking changes)
app.route('/api/v2/videos', videosV2);
```

## Conclusion

This architecture provides:
- ✅ Type safety end-to-end
- ✅ Scalable video processing
- ✅ Secure authentication
- ✅ Modern best practices
- ✅ Easy to extend and maintain
- ✅ Production-ready foundation

For questions or improvements, please open an issue or PR.
