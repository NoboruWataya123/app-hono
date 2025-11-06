import { z } from '@hono/zod-openapi';

// Subscription schema
export const SubscriptionSchema = z
  .object({
    id: z.string().openapi({ example: 'sub_abc123' }),
    userId: z.string().openapi({ example: 'usr_abc123' }),
    plan: z.enum(['free', 'basic', 'premium']).openapi({ example: 'basic' }),
    status: z.enum(['active', 'canceled', 'expired', 'trial']).openapi({ example: 'active' }),
    currentPeriodStart: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
    currentPeriodEnd: z.string().datetime().openapi({ example: '2024-02-01T00:00:00Z' }),
    cancelAtPeriodEnd: z.boolean().openapi({ example: false }),
    yookassaPaymentMethodId: z.string().nullable().openapi({ example: 'pm_abc123' }),
    autoRenewal: z.boolean().openapi({ example: true }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('Subscription');

// Create subscription request
export const CreateSubscriptionSchema = z
  .object({
    plan: z.enum(['basic', 'premium']).openapi({
      example: 'basic',
      description: 'Subscription plan (free is default, no payment required)',
    }),
    returnUrl: z.string().url().openapi({
      example: 'https://example.com/payment/success',
      description: 'URL to redirect user after payment',
    }),
  })
  .openapi('CreateSubscription');

// Cancel subscription request
export const CancelSubscriptionSchema = z
  .object({
    cancelAtPeriodEnd: z.boolean().default(true).openapi({
      example: true,
      description: 'If true, subscription will be canceled at the end of the current period',
    }),
  })
  .openapi('CancelSubscription');

// Subscription response
export const SubscriptionResponseSchema = z
  .object({
    subscription: SubscriptionSchema,
    paymentUrl: z.string().url().optional().openapi({
      example: 'https://yookassa.ru/checkout/payments/abc123',
      description: 'URL to redirect user for payment (if payment is required)',
    }),
  })
  .openapi('SubscriptionResponse');

// Payment schema
export const PaymentSchema = z
  .object({
    id: z.string().openapi({ example: 'pay_abc123' }),
    userId: z.string().openapi({ example: 'usr_abc123' }),
    subscriptionId: z.string().nullable().openapi({ example: 'sub_abc123' }),
    yookassaPaymentId: z.string().openapi({ example: 'yoo_abc123' }),
    amount: z.number().openapi({ example: 29900, description: 'Amount in kopecks' }),
    currency: z.string().openapi({ example: 'RUB' }),
    status: z
      .enum(['pending', 'succeeded', 'canceled', 'waiting_for_capture'])
      .openapi({ example: 'succeeded' }),
    description: z.string().nullable().openapi({ example: 'Subscription payment' }),
    paid: z.boolean().openapi({ example: true }),
    refundable: z.boolean().openapi({ example: true }),
    test: z.boolean().openapi({ example: false }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00Z' }),
  })
  .openapi('Payment');

// Payment list response
export const PaymentListResponseSchema = z
  .object({
    payments: z.array(PaymentSchema),
    total: z.number().openapi({ example: 10 }),
  })
  .openapi('PaymentListResponse');
