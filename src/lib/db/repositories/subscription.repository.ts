import { eq, and, gte } from 'drizzle-orm';
import { db } from '../client';
import { subscriptions, type Subscription, type NewSubscription } from '../schema';

export class SubscriptionRepository {
  /**
   * Create a new subscription
   */
  static async create(data: NewSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(data).returning();
    return subscription;
  }

  /**
   * Find subscription by ID
   */
  static async findById(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    return subscription;
  }

  /**
   * Find active subscription by user ID
   */
  static async findActiveByUserId(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          gte(subscriptions.currentPeriodEnd, new Date())
        )
      )
      .orderBy(subscriptions.createdAt)
      .limit(1);
    return subscription;
  }

  /**
   * Find all subscriptions by user ID
   */
  static async findByUserId(userId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(subscriptions.createdAt);
  }

  /**
   * Update subscription
   */
  static async update(
    id: string,
    data: Partial<NewSubscription>
  ): Promise<Subscription | undefined> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  /**
   * Cancel subscription (mark for cancellation at period end)
   */
  static async cancel(id: string): Promise<Subscription | undefined> {
    return this.update(id, { cancelAtPeriodEnd: true });
  }

  /**
   * Reactivate subscription
   */
  static async reactivate(id: string): Promise<Subscription | undefined> {
    return this.update(id, { cancelAtPeriodEnd: false });
  }

  /**
   * Expire subscription
   */
  static async expire(id: string): Promise<Subscription | undefined> {
    return this.update(id, { status: 'expired' });
  }

  /**
   * Find expired subscriptions that need to be processed
   */
  static async findExpired(): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          gte(new Date(), subscriptions.currentPeriodEnd)
        )
      );
  }
}
