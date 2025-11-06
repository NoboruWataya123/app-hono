import { eq } from 'drizzle-orm';
import { db } from '../client';
import { genres, type Genre, type NewGenre } from '../schema';

export class GenreRepository {
  /**
   * Create a new genre
   */
  static async create(data: NewGenre): Promise<Genre> {
    const [genre] = await db.insert(genres).values(data).returning();
    return genre;
  }

  /**
   * Find genre by ID
   */
  static async findById(id: string): Promise<Genre | undefined> {
    const [genre] = await db.select().from(genres).where(eq(genres.id, id)).limit(1);
    return genre;
  }

  /**
   * Find genre by slug
   */
  static async findBySlug(slug: string): Promise<Genre | undefined> {
    const [genre] = await db.select().from(genres).where(eq(genres.slug, slug)).limit(1);
    return genre;
  }

  /**
   * Get all genres
   */
  static async findAll(): Promise<Genre[]> {
    return await db.select().from(genres);
  }
}
