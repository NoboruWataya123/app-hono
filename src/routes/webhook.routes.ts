import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from '@hono/zod-openapi';
import { PaymentRepository, SubscriptionRepository } from '../lib/db/repositories';

export const webhookApp = new OpenAPIHono();

// YooKassa webhook notification schema
const YooKassaWebhookSchema = z.object({
  type: z.enum(['notification']),
  event: z.enum(['payment.succeeded', 'payment.canceled', 'payment.waiting_for_capture']),
  object: z.object({
    id: z.string(),
    status: z.enum(['pending', 'waiting_for_capture', 'succeeded', 'canceled']),
    paid: z.boolean(),
    amount: z.object({
      value: z.string(),
      currency: z.string(),
    }),
    created_at: z.string(),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    payment_method: z
      .object({
        type: z.string(),
        id: z.string().optional(),
        saved: z.boolean().optional(),
      })
      .optional(),
    refundable: z.boolean().optional(),
    test: z.boolean().optional(),
  }),
});

// YooKassa webhook endpoint
const yooKassaWebhookRoute = createRoute({
  method: 'post',
  path: '/yookassa',
  tags: ['Webhooks'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: YooKassaWebhookSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: 'Webhook processed successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
          }),
        },
      },
      description: 'Bad request',
    },
  },
});

webhookApp.openapi(yooKassaWebhookRoute, async (c) => {
  try {
    const notification = c.req.valid('json');

    const { event, object: payment } = notification;

    // Find payment in our database
    const dbPayment = await PaymentRepository.findByYooKassaId(payment.id);

    if (!dbPayment) {
      console.error(`Payment not found: ${payment.id}`);
      return c.json({ success: false, error: 'Payment not found' }, 400);
    }

    // Handle different events
    switch (event) {
      case 'payment.succeeded':
        // Payment succeeded, activate subscription
        await PaymentRepository.markSucceeded(payment.id);

        if (dbPayment.subscriptionId) {
          const subscription = await SubscriptionRepository.findById(
            dbPayment.subscriptionId
          );

          if (subscription) {
            // Save payment method ID for recurring payments
            const paymentMethodId = payment.payment_method?.id;

            await SubscriptionRepository.update(subscription.id, {
              status: 'active',
              yookassaPaymentMethodId: paymentMethodId || null,
            });

            console.log(`Subscription ${subscription.id} activated`);
          }
        }
        break;

      case 'payment.canceled':
        // Payment canceled
        await PaymentRepository.markCanceled(payment.id);

        if (dbPayment.subscriptionId) {
          // Don't activate subscription
          await SubscriptionRepository.update(dbPayment.subscriptionId, {
            status: 'canceled',
          });

          console.log(`Subscription ${dbPayment.subscriptionId} canceled`);
        }
        break;

      case 'payment.waiting_for_capture':
        // Payment is on hold, waiting for capture
        // Update payment status
        await PaymentRepository.updateByYooKassaId(payment.id, {
          status: 'waiting_for_capture',
        });

        console.log(`Payment ${payment.id} is waiting for capture`);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default webhookApp;
