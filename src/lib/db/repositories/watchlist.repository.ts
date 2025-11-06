import { eq, and, desc } from 'drizzle-orm';
import { db } from '../client';
import { watchlist, videos, type Watchlist, type NewWatchlist } from '../schema';

export class WatchlistRepository {
  /**
   * Add video to watchlist
   */
  static async add(data: NewWatchlist): Promise<Watchlist> {
    const [item] = await db.insert(watchlist).values(data).returning();
    return item;
  }

  /**
   * Remove video from watchlist
   */
  static async remove(userId: string, videoId: string): Promise<boolean> {
    const result = await db
      .delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.videoId, videoId)))
      .returning();
    return result.length > 0;
  }

  /**
   * Check if video is in watchlist
   */
  static async exists(userId: string, videoId: string): Promise<boolean> {
    const [item] = await db
      .select()
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.videoId, videoId)))
      .limit(1);
    return !!item;
  }

  /**
   * Get user's watchlist with video details
   */
  static async findByUserId(userId: string): Promise<any[]> {
    return await db
      .select({
        id: watchlist.id,
        videoId: watchlist.videoId,
        addedAt: watchlist.createdAt,
        video: videos,
      })
      .from(watchlist)
      .innerJoin(videos, eq(watchlist.videoId, videos.id))
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt));
  }

  /**
   * Get watchlist count for user
   */
  static async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId));
    return result.length;
  }
}
