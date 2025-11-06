import { eq, and, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../client';
import { videos, type Video, type NewVideo } from '../schema';

export class VideoRepository {
  /**
   * Create a new video
   */
  static async create(data: NewVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(data).returning();
    return video;
  }

  /**
   * Find video by ID
   */
  static async findById(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return video;
  }

  /**
   * Update video
   */
  static async update(id: string, data: Partial<NewVideo>): Promise<Video | undefined> {
    const [updated] = await db
      .update(videos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete video
   */
  static async delete(id: string): Promise<boolean> {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return result.rowCount > 0;
  }

  /**
   * Find all videos with optional filters
   */
  static async findAll(filters?: {
    categoryId?: string;
    genre?: string;
    status?: string;
    search?: string;
    isPublic?: boolean;
    uploadedBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ videos: Video[]; total: number }> {
    const conditions = [];

    if (filters?.categoryId) {
      conditions.push(eq(videos.categoryId, filters.categoryId));
    }

    if (filters?.genre) {
      // Search in jsonb array
      conditions.push(sql`${videos.genres} @> ${JSON.stringify([filters.genre])}`);
    }

    if (filters?.status) {
      conditions.push(eq(videos.status, filters.status as any));
    }

    if (filters?.search) {
      conditions.push(
        sql`(${ilike(videos.title, `%${filters.search}%`)} OR ${ilike(videos.description, `%${filters.search}%`)})`
      );
    }

    if (filters?.isPublic !== undefined) {
      conditions.push(eq(videos.isPublic, filters.isPublic));
    }

    if (filters?.uploadedBy) {
      conditions.push(eq(videos.uploadedBy, filters.uploadedBy));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(whereClause);

    // Get videos
    const result = await db
      .select()
      .from(videos)
      .where(whereClause)
      .orderBy(desc(videos.createdAt))
      .limit(filters?.limit || 20)
      .offset(filters?.offset || 0);

    return {
      videos: result,
      total: Number(count),
    };
  }

  /**
   * Find videos by category
   */
  static async findByCategory(categoryId: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.categoryId, categoryId));
  }

  /**
   * Find videos by user
   */
  static async findByUser(userId: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.uploadedBy, userId));
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(id: string): Promise<boolean> {
    const result = await db
      .update(videos)
      .set({ viewCount: sql`${videos.viewCount} + 1` })
      .where(eq(videos.id, id));
    return result.rowCount > 0;
  }

  /**
   * Search videos
   */
  static async search(query: string, limit = 20, offset = 0): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(
        sql`(${ilike(videos.title, `%${query}%`)} OR ${ilike(videos.description, `%${query}%`)})`
      )
      .orderBy(desc(videos.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
