import { eq, or } from 'drizzle-orm';
import { db } from '../client';
import { users, type User, type NewUser } from '../schema';

export class UserRepository {
  /**
   * Create a new user
   */
  static async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  /**
   * Check if email or username exists
   */
  static async exists(email: string, username: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);
    return !!user;
  }

  /**
   * Update user
   */
  static async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  /**
   * Get all users
   */
  static async findAll(): Promise<User[]> {
    return await db.select().from(users);
  }
}
