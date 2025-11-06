import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { payments, type Payment, type NewPayment } from '../schema';

export class PaymentRepository {
  /**
   * Create a new payment
   */
  static async create(data: NewPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  /**
   * Find payment by ID
   */
  static async findById(id: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return payment;
  }

  /**
   * Find payment by YooKassa payment ID
   */
  static async findByYooKassaId(yookassaPaymentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.yookassaPaymentId, yookassaPaymentId))
      .limit(1);
    return payment;
  }

  /**
   * Find all payments by user ID
   */
  static async findByUserId(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  /**
   * Find all payments by subscription ID
   */
  static async findBySubscriptionId(subscriptionId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.subscriptionId, subscriptionId))
      .orderBy(desc(payments.createdAt));
  }

  /**
   * Update payment
   */
  static async update(
    id: string,
    data: Partial<NewPayment>
  ): Promise<Payment | undefined> {
    const [updated] = await db
      .update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }

  /**
   * Update payment by YooKassa payment ID
   */
  static async updateByYooKassaId(
    yookassaPaymentId: string,
    data: Partial<NewPayment>
  ): Promise<Payment | undefined> {
    const [updated] = await db
      .update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.yookassaPaymentId, yookassaPaymentId))
      .returning();
    return updated;
  }

  /**
   * Mark payment as succeeded
   */
  static async markSucceeded(yookassaPaymentId: string): Promise<Payment | undefined> {
    return this.updateByYooKassaId(yookassaPaymentId, {
      status: 'succeeded',
      paid: true,
    });
  }

  /**
   * Mark payment as canceled
   */
  static async markCanceled(yookassaPaymentId: string): Promise<Payment | undefined> {
    return this.updateByYooKassaId(yookassaPaymentId, {
      status: 'canceled',
    });
  }
}
