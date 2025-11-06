import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // S3
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ENDPOINT: z.string().optional(),

  // Video Processing
  FFMPEG_PATH: z.string().default('/usr/bin/ffmpeg'),
  FFPROBE_PATH: z.string().default('/usr/bin/ffprobe'),
  VIDEO_QUALITY_LEVELS: z.string().default('360p,480p,720p,1080p'),
  DEFAULT_VIDEO_CODEC: z.string().default('av1'),
  TEMP_UPLOAD_DIR: z.string().default('/tmp/uploads'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  try {
    const env = {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
      S3_BUCKET: process.env.S3_BUCKET,
      S3_REGION: process.env.S3_REGION,
      S3_ENDPOINT: process.env.S3_ENDPOINT,
      FFMPEG_PATH: process.env.FFMPEG_PATH,
      FFPROBE_PATH: process.env.FFPROBE_PATH,
      VIDEO_QUALITY_LEVELS: process.env.VIDEO_QUALITY_LEVELS,
      DEFAULT_VIDEO_CODEC: process.env.DEFAULT_VIDEO_CODEC,
      TEMP_UPLOAD_DIR: process.env.TEMP_UPLOAD_DIR,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
    };

    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadEnv();
