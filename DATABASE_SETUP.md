# 🗄️ Database Setup Guide

This guide will help you set up PostgreSQL with Drizzle ORM for the Regional Streaming Service.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js or Bun installed

## Quick Start

### 1. Install PostgreSQL

#### macOS (using Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### Windows
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE streaming;
CREATE USER streaming_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE streaming TO streaming_user;

# Exit psql
\q
```

### 3. Configure Environment

Update your `.env` file:

```env
DATABASE_URL=postgresql://streaming_user:your_password@localhost:5432/streaming
```

### 4. Install Dependencies

```bash
npm install  # or: bun install
```

### 5. Generate Migrations

```bash
npm run db:generate
```

This will create migration files in the `drizzle/` directory based on your schema.

### 6. Run Migrations

```bash
npm run db:migrate
```

This applies all pending migrations to your database.

### 7. Seed Database (Optional)

```bash
bun run src/lib/db/seed.ts
```

This will populate your database with:
- Default genres (Drama, Comedy, Thriller, etc.)
- Default categories (Independent Films, Short Films, Documentaries)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Videos Table
```sql
CREATE TABLE videos (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  original_filename VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  thumbnail_key VARCHAR(500),
  duration INTEGER DEFAULT 0,
  size INTEGER DEFAULT 0,
  format VARCHAR(50),
  codec VARCHAR(50),
  resolutions JSONB DEFAULT '[]',
  status video_status DEFAULT 'uploading',
  category_id VARCHAR(50),
  genres JSONB DEFAULT '[]',
  uploaded_by VARCHAR(50) NOT NULL,
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Categories Table
```sql
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  thumbnail_key VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Genres Table
```sql
CREATE TABLE genres (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL
);
```

## Drizzle Commands

### Generate Migrations
```bash
npm run db:generate
```
Creates new migration files based on schema changes.

### Apply Migrations
```bash
npm run db:migrate
```
Runs all pending migrations.

### Drizzle Studio
```bash
npm run db:studio
```
Opens Drizzle Studio at `https://local.drizzle.studio` for visual database management.

### Push Schema (Development Only)
```bash
npm run db:push
```
Pushes schema changes directly to database without creating migrations. **Use with caution!**

## Using Drizzle ORM

### Repositories

All database operations use repository pattern located in `src/lib/db/repositories/`:

```typescript
import { UserRepository, VideoRepository, CategoryRepository } from '../lib/db/repositories';

// Create user
const user = await UserRepository.create({
  id: `usr_${nanoid(10)}`,
  email: 'user@example.com',
  username: 'johndoe',
  passwordHash: hashedPassword,
  role: 'user',
});

// Find user by email
const user = await UserRepository.findByEmail('user@example.com');

// Update user
const updated = await UserRepository.update(userId, {
  username: 'newusername',
});

// Find all videos with filters
const { videos, total } = await VideoRepository.findAll({
  categoryId: 'cat_123',
  status: 'ready',
  limit: 20,
  offset: 0,
});
```

### Direct Queries

For custom queries, use the Drizzle client:

```typescript
import { db } from './lib/db/client';
import { users, videos } from './lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Custom query
const result = await db
  .select()
  .from(videos)
  .where(and(
    eq(videos.isPublic, true),
    eq(videos.status, 'ready')
  ))
  .orderBy(desc(videos.viewCount))
  .limit(10);
```

## Production Considerations

### Connection Pooling

The default configuration uses a connection pool of 10:

```typescript
const client = postgres(DATABASE_URL, {
  max: 10,                // Max connections
  idle_timeout: 20,       // Close idle connections after 20s
  connect_timeout: 10,    // Connection timeout
});
```

### Migrations in Production

1. **Always use migrations** - Never use `db:push` in production
2. **Backup before migrating** - Always backup your database first
3. **Test migrations** - Test on staging environment first
4. **Zero-downtime migrations** - Use techniques like:
   - Add new column (nullable)
   - Deploy code that can handle both old and new schema
   - Backfill data
   - Make column not-nullable
   - Remove old column

### Environment Variables

Production `.env`:
```env
DATABASE_URL=postgresql://user:password@production-host:5432/streaming?sslmode=require
```

For managed PostgreSQL services:
- **AWS RDS**: Requires SSL, use `?sslmode=require`
- **Heroku Postgres**: Auto-configures SSL
- **DigitalOcean**: Use connection pooler endpoint
- **Supabase**: Use connection pooling mode for serverless

### Indexes

Add indexes for frequently queried fields:

```sql
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX idx_videos_category_id ON videos(category_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
```

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Make sure PostgreSQL is running:
```bash
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql
```

### Authentication Failed
```
Error: password authentication failed for user
```
**Solution**: Check your DATABASE_URL credentials match PostgreSQL user.

### Database Does Not Exist
```
Error: database "streaming" does not exist
```
**Solution**: Create the database first:
```bash
psql postgres -c "CREATE DATABASE streaming;"
```

### Migration Errors
```
Error: relation "users" already exists
```
**Solution**: Drop and recreate database (development only):
```bash
psql postgres -c "DROP DATABASE streaming;"
psql postgres -c "CREATE DATABASE streaming;"
npm run db:migrate
```

## Backup and Restore

### Backup
```bash
pg_dump -U streaming_user -d streaming > backup.sql
```

### Restore
```bash
psql -U streaming_user -d streaming < backup.sql
```

## Monitoring

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('streaming'));
```

### Check Table Sizes
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Active Connections
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'streaming';
```

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [postgres.js Documentation](https://github.com/porsager/postgres)

---

**Need help?** Check the [main README](README.md) or open an issue on GitHub.
