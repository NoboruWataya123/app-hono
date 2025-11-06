import { eq } from 'drizzle-orm';
import { db } from '../client';
import { categories, type Category, type NewCategory } from '../schema';

export class CategoryRepository {
  /**
   * Create a new category
   */
  static async create(data: NewCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  /**
   * Find category by ID
   */
  static async findById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return category;
  }

  /**
   * Find category by slug
   */
  static async findBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return category;
  }

  /**
   * Update category
   */
  static async update(id: string, data: Partial<NewCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete category
   */
  static async delete(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount > 0;
  }

  /**
   * Get all categories
   */
  static async findAll(): Promise<Category[]> {
    return await db.select().from(categories);
  }
}
