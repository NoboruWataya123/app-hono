export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  originalFilename: string;
  s3Key: string;
  thumbnailKey?: string;
  duration: number;
  size: number;
  format: string;
  codec: string;
  resolutions: VideoResolution[];
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  categoryId?: string;
  genres: string[];
  uploadedBy: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoResolution {
  quality: string; // 360p, 480p, 720p, 1080p
  s3Key: string;
  width: number;
  height: number;
  bitrate: number;
  size: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnailKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface UploadProgress {
  videoId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  currentStep?: string;
  error?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  fps: number;
  format: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}
