import { eq, and, desc } from 'drizzle-orm';
import { db } from '../client';
import { watchHistory, videos, type WatchHistory, type NewWatchHistory } from '../schema';

export class WatchHistoryRepository {
  /**
   * Create or update watch history entry
   */
  static async upsert(data: NewWatchHistory): Promise<WatchHistory> {
    // Check if entry exists
    const existing = await this.findByUserAndVideo(data.userId, data.videoId);

    if (existing) {
      // Update existing entry
      const [updated] = await db
        .update(watchHistory)
        .set({
          watchedDuration: data.watchedDuration,
          totalDuration: data.totalDuration,
          completed: data.completed,
          lastWatchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(watchHistory.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [created] = await db.insert(watchHistory).values(data).returning();
      return created;
    }
  }

  /**
   * Find watch history entry by user and video
   */
  static async findByUserAndVideo(
    userId: string,
    videoId: string
  ): Promise<WatchHistory | undefined> {
    const [entry] = await db
      .select()
      .from(watchHistory)
      .where(and(eq(watchHistory.userId, userId), eq(watchHistory.videoId, videoId)))
      .limit(1);
    return entry;
  }

  /**
   * Get user's watch history with video details
   */
  static async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<any[]> {
    const query = db
      .select({
        id: watchHistory.id,
        videoId: watchHistory.videoId,
        watchedDuration: watchHistory.watchedDuration,
        totalDuration: watchHistory.totalDuration,
        completed: watchHistory.completed,
        lastWatchedAt: watchHistory.lastWatchedAt,
        video: videos,
      })
      .from(watchHistory)
      .innerJoin(videos, eq(watchHistory.videoId, videos.id))
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.lastWatchedAt));

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return await query;
  }

  /**
   * Get continue watching list (videos that are partially watched)
   */
  static async getContinueWatching(userId: string, limit = 10): Promise<any[]> {
    return await db
      .select({
        id: watchHistory.id,
        videoId: watchHistory.videoId,
        watchedDuration: watchHistory.watchedDuration,
        totalDuration: watchHistory.totalDuration,
        progress: watchHistory.watchedDuration,
        lastWatchedAt: watchHistory.lastWatchedAt,
        video: videos,
      })
      .from(watchHistory)
      .innerJoin(videos, eq(watchHistory.videoId, videos.id))
      .where(and(eq(watchHistory.userId, userId), eq(watchHistory.completed, false)))
      .orderBy(desc(watchHistory.lastWatchedAt))
      .limit(limit);
  }

  /**
   * Delete watch history entry
   */
  static async delete(userId: string, videoId: string): Promise<boolean> {
    const result = await db
      .delete(watchHistory)
      .where(and(eq(watchHistory.userId, userId), eq(watchHistory.videoId, videoId)));
    return result.rowCount > 0;
  }

  /**
   * Clear all watch history for user
   */
  static async clearAll(userId: string): Promise<boolean> {
    const result = await db.delete(watchHistory).where(eq(watchHistory.userId, userId));
    return result.rowCount > 0;
  }

  /**
   * Get watch history count for user
   */
  static async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(watchHistory)
      .where(eq(watchHistory.userId, userId));
    return result.length;
  }
}
