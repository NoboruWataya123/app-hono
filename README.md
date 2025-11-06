# 🎬 Regional Streaming Service

A modern, minimalist video streaming platform built for regional and independent films. Think Netflix, but for local indie content.

## ✨ Features

- **🎥 AV1 Video Encoding** - Next-generation video codec for efficient, high-quality streaming
- **📊 Multiple Quality Levels** - Adaptive streaming (360p, 480p, 720p, 1080p)
- **☁️ S3 Storage** - Scalable cloud storage compatible with AWS S3, Cloudflare R2, MinIO, and more
- **🔐 JWT Authentication** - Secure user authentication and authorization
- **📦 Video Processing** - Automatic transcoding to multiple resolutions
- **🏷️ Categories & Genres** - Organized content discovery
- **📡 Presigned URLs** - Secure video streaming without exposing credentials
- **💳 YooKassa Billing** - Integrated payment gateway with subscriptions
- **⭐ Watchlist** - Add videos to favorites for later viewing
- **📜 Watch History** - Track viewing progress and continue watching
- **📖 OpenAPI Documentation** - Interactive API documentation with Swagger UI
- **🔄 RESTful API** - Clean, well-documented API design

## 🛠️ Tech Stack

### Backend
- **[Hono.js](https://hono.dev/)** - Ultra-fast web framework
- **[Zod OpenAPI Hono](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)** - Type-safe validation and OpenAPI generation
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM for PostgreSQL
- **[postgres.js](https://github.com/porsager/postgres)** - Fast PostgreSQL client
- **[Bun S3](https://bun.sh/docs/api/s3)** - Native S3 integration
- **[FFmpeg](https://ffmpeg.org/)** - Video processing and transcoding
- **[YooKassa](https://yookassa.ru/)** - Russian payment gateway
- **TypeScript** - Type safety and better DX

### Features
- PostgreSQL database with Drizzle ORM
- Repository pattern for clean data access
- JWT authentication with bcrypt password hashing
- YooKassa subscription billing
- Watchlist and watch history tracking
- Modular, maintainable architecture
- Best practices for Hono.js development

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - The code is written for Node.js but designed for Bun
- **PostgreSQL** (v14 or higher) - Database
  ```bash
  # Ubuntu/Debian
  sudo apt-get install postgresql postgresql-contrib

  # macOS
  brew install postgresql@16

  # Windows
  # Download from https://www.postgresql.org/download/windows/
  ```
- **FFmpeg** - Required for video processing
  ```bash
  # Ubuntu/Debian
  sudo apt-get install ffmpeg

  # macOS
  brew install ffmpeg

  # Windows (use Chocolatey)
  choco install ffmpeg
  ```
- **S3-compatible storage** - AWS S3, Cloudflare R2, MinIO, or DigitalOcean Spaces

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd app-hono
npm install  # or: bun install (when using Bun)
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streaming

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# S3 Configuration
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=streaming-videos
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
VIDEO_QUALITY_LEVELS=360p,480p,720p,1080p
DEFAULT_VIDEO_CODEC=av1
TEMP_UPLOAD_DIR=/tmp/uploads

# CORS
CORS_ORIGIN=http://localhost:3001

# YooKassa Payment Gateway
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key
```

### 3. Database Setup

Create PostgreSQL database:

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE streaming;

# Exit
\q
```

Run migrations:

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# Seed with initial data (optional)
npm run db:seed
```

For detailed database setup, see [DATABASE_SETUP.md](DATABASE_SETUP.md)

### 4. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

### 4. Access API Documentation

Open your browser and navigate to:
- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI Spec**: http://localhost:3000/api/openapi.json

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Videos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | List all videos (with filtering) |
| GET | `/api/videos/:id` | Get video details |
| POST | `/api/videos` | Create video and get upload URL |
| PATCH | `/api/videos/:id` | Update video metadata |
| DELETE | `/api/videos/:id` | Delete video |
| GET | `/api/videos/:id/stream` | Get streaming URL |
| POST | `/api/videos/:id/process` | Trigger video processing |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user profile |
| PATCH | `/api/users/me` | Update current user |
| GET | `/api/users/:id/videos` | Get user's videos |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/:id` | Get category details |
| GET | `/api/categories/:id/videos` | Get videos in category |
| POST | `/api/categories` | Create category (admin) |
| PATCH | `/api/categories/:id` | Update category (admin) |
| DELETE | `/api/categories/:id` | Delete category (admin) |
| GET | `/api/categories/genres` | List all genres |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/current` | Get current subscription |
| POST | `/api/subscriptions` | Create subscription |
| POST | `/api/subscriptions/cancel` | Cancel subscription |
| POST | `/api/subscriptions/reactivate` | Reactivate subscription |
| GET | `/api/subscriptions/payments` | Get payment history |

### Watchlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist` | Get user's watchlist |
| POST | `/api/watchlist` | Add video to watchlist |
| DELETE | `/api/watchlist/:videoId` | Remove video from watchlist |
| GET | `/api/watchlist/:videoId/check` | Check if video is in watchlist |

### Watch History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watch-history` | Get watch history |
| POST | `/api/watch-history` | Update watch progress |
| GET | `/api/watch-history/continue` | Get continue watching list |
| DELETE | `/api/watch-history/:videoId` | Delete watch history entry |
| DELETE | `/api/watch-history` | Clear all watch history |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/yookassa` | YooKassa payment notifications |

## 🎯 Usage Examples

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "SecurePass123!"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user"
  }
}
```

### 3. Upload a Video

#### Step 1: Create video entry and get upload URL

```bash
curl -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Indie Film",
    "description": "An amazing local film",
    "filename": "my-film.mp4",
    "categoryId": "cat_123",
    "genres": ["drama", "thriller"],
    "isPublic": true
  }'
```

Response:
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/...",
  "videoId": "vid_xyz789",
  "expiresIn": 3600
}
```

#### Step 2: Upload video to presigned URL

```bash
curl -X PUT "UPLOAD_URL_FROM_STEP_1" \
  -H "Content-Type: video/mp4" \
  --data-binary @my-film.mp4
```

#### Step 3: Trigger video processing

```bash
curl -X POST http://localhost:3000/api/videos/vid_xyz789/process \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Get Streaming URL

```bash
curl -X GET "http://localhost:3000/api/videos/vid_xyz789/stream?quality=720p" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🏗️ Project Structure

```
src/
├── config/
│   └── env.ts                    # Environment configuration
├── lib/
│   ├── db/
│   │   ├── client.ts            # PostgreSQL client
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   ├── migrate.ts           # Migration runner
│   │   ├── seed.ts              # Database seeding
│   │   └── repositories/        # Data access layer
│   │       ├── user.repository.ts
│   │       ├── video.repository.ts
│   │       ├── category.repository.ts
│   │       ├── genre.repository.ts
│   │       ├── subscription.repository.ts
│   │       ├── payment.repository.ts
│   │       ├── watchlist.repository.ts
│   │       └── watch-history.repository.ts
│   ├── ffmpeg/
│   │   └── wrapper.ts           # FFmpeg CLI wrapper
│   ├── s3/
│   │   └── client.ts            # S3 service utilities
│   └── yookassa/
│       └── client.ts            # YooKassa payment client
├── middleware/
│   └── auth.ts                  # Authentication middleware
├── routes/
│   ├── auth.routes.ts           # Authentication routes
│   ├── video.routes.ts          # Video management routes
│   ├── user.routes.ts           # User management routes
│   ├── category.routes.ts       # Category/genre routes
│   ├── subscription.routes.ts   # Subscription routes
│   ├── webhook.routes.ts        # Payment webhook handler
│   ├── watchlist.routes.ts      # Watchlist routes
│   └── watch-history.routes.ts  # Watch history routes
├── schemas/
│   ├── user.schemas.ts          # User validation schemas
│   ├── video.schemas.ts         # Video validation schemas
│   ├── category.schemas.ts      # Category validation schemas
│   ├── subscription.schemas.ts  # Subscription schemas
│   └── watchlist.schemas.ts     # Watchlist/history schemas
├── types/
│   └── index.ts                 # TypeScript type definitions
├── utils/
│   └── auth.ts                  # Authentication utilities
└── index.ts                     # Main application entry
```

## 🎨 Architecture Highlights

### Best Practices

✅ **Direct handler definitions** - No RoR-style controllers, handlers defined inline for proper type inference

```typescript
// ✅ Good - Types inferred correctly
app.openapi(route, (c) => {
  const { id } = c.req.param('id') // Type: string
  return c.json(result)
})

// ❌ Bad - Type inference broken
const controller = (c: Context) => {
  const id = c.req.param('id') // Type: any
}
app.get('/videos/:id', controller)
```

✅ **Modular structure** - Each domain has its own routes, schemas, and logic

✅ **Type-safe validation** - Zod schemas for runtime validation and type inference

✅ **OpenAPI first** - API documentation generated from code

✅ **S3 native** - Using Bun's fast S3 bindings

✅ **FFmpeg wrapper** - Clean CLI wrapper without heavy dependencies

### Video Processing Flow

1. **Upload** - User gets presigned S3 URL for direct upload
2. **Process** - Trigger processing endpoint
3. **Transcode** - FFmpeg transcodes to multiple resolutions (AV1)
4. **Store** - Processed videos stored in S3
5. **Stream** - Presigned URLs generated for secure streaming

## 🔄 Migrating to Bun

This code is written for Node.js but follows Bun best practices. To migrate:

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run the server
bun run dev
```

The main changes needed:
- S3 client already uses Bun's native API
- `spawn` in FFmpeg wrapper will work with Bun
- Replace `npm` scripts with `bun` in package.json

## 🔐 Security Notes

⚠️ **Production Checklist:**

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Use HTTPS in production
- [ ] Set up proper S3 bucket policies
- [ ] Enable CORS only for trusted origins
- [ ] Implement rate limiting
- [ ] Add input sanitization
- [ ] Set up proper logging and monitoring
- [ ] Use a real database (PostgreSQL recommended)
- [ ] Implement video upload size limits
- [ ] Add file type validation
- [ ] Set up CDN for video delivery

## 🗄️ Database Migration

The current implementation uses an in-memory store. For production, migrate to a real database:

### Recommended: PostgreSQL with Prisma

```bash
npm install @prisma/client prisma
npx prisma init
```

Create your schema in `prisma/schema.prisma` based on `src/types/index.ts`

### Alternative: MongoDB

```bash
npm install mongodb
```

Replace `src/lib/db/store.ts` with MongoDB operations.

## 🎬 Video Codec Notes

### AV1 Encoding

AV1 provides ~30% better compression than H.264 but:
- Encoding is slower (2-10x)
- Not all devices support it yet
- Consider H.264 fallback for wider compatibility

To use H.264 instead, set in `.env`:
```env
DEFAULT_VIDEO_CODEC=h264
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! This is a starter template - feel free to extend it with:

- Job queue for video processing (Bull, BullMQ)
- WebSockets for upload progress
- Video analytics
- Comments and ratings
- Recommendations engine
- Admin dashboard
- CDN integration
- Social features (likes, shares)
- Email notifications
- Multi-language support

## 🙏 Acknowledgments

- [Hono.js](https://hono.dev/) - Amazing web framework
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [FFmpeg](https://ffmpeg.org/) - Video processing powerhouse
- [Zod](https://zod.dev/) - Type-safe validation

---

**Built with ❤️ for indie filmmakers and regional content creators**
