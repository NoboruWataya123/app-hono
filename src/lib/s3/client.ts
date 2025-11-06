import { S3Client } from 'bun';
import { config } from '../../config/env';

/**
 * S3 client instance configured from environment variables
 */
export const s3Client = new S3Client({
  accessKeyId: config.S3_ACCESS_KEY_ID,
  secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  bucket: config.S3_BUCKET,
  region: config.S3_REGION,
  ...(config.S3_ENDPOINT && { endpoint: config.S3_ENDPOINT }),
});

/**
 * Helper functions for S3 operations
 */
export class S3Service {
  /**
   * Upload a file to S3
   */
  static async upload(
    key: string,
    data: string | Uint8Array | ArrayBuffer | Blob | ReadableStream,
    options?: { contentType?: string; acl?: string }
  ): Promise<void> {
    const file = s3Client.file(key);
    await file.write(data, {
      type: options?.contentType,
    });
  }

  /**
   * Download a file from S3
   */
  static async download(key: string): Promise<Uint8Array> {
    const file = s3Client.file(key);
    return await file.bytes();
  }

  /**
   * Stream a file from S3
   */
  static stream(key: string): ReadableStream {
    const file = s3Client.file(key);
    return file.stream();
  }

  /**
   * Get a presigned URL for a file
   */
  static presignUrl(
    key: string,
    options?: {
      expiresIn?: number;
      method?: 'GET' | 'PUT' | 'DELETE';
      acl?: string;
    }
  ): string {
    const file = s3Client.file(key);
    return file.presign({
      expiresIn: options?.expiresIn || 3600, // Default 1 hour
      method: options?.method || 'GET',
      ...(options?.acl && { acl: options.acl }),
    });
  }

  /**
   * Delete a file from S3
   */
  static async delete(key: string): Promise<void> {
    const file = s3Client.file(key);
    await file.delete();
  }

  /**
   * Delete multiple files from S3
   */
  static async deleteMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)));
  }

  /**
   * Check if a file exists in S3
   */
  static async exists(key: string): Promise<boolean> {
    const file = s3Client.file(key);
    return await file.exists();
  }

  /**
   * Get file metadata
   */
  static async stat(key: string) {
    const file = s3Client.file(key);
    return await file.stat();
  }

  /**
   * Get file size
   */
  static async size(key: string): Promise<number> {
    const stat = await this.stat(key);
    return stat.size;
  }

  /**
   * Copy a file within S3
   */
  static async copy(sourceKey: string, destKey: string): Promise<void> {
    const sourceData = await this.download(sourceKey);
    const sourceStat = await this.stat(sourceKey);
    await this.upload(destKey, sourceData, { contentType: sourceStat.type });
  }

  /**
   * Generate a unique key for uploads
   */
  static generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = filename.split('.').pop();
    return `${prefix}/${timestamp}-${random}.${ext}`;
  }

  /**
   * Get file as S3File reference
   */
  static file(key: string) {
    return s3Client.file(key);
  }
}
