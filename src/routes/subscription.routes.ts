import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../middleware/auth';
import {
  SubscriptionSchema,
  CreateSubscriptionSchema,
  CancelSubscriptionSchema,
  SubscriptionResponseSchema,
  PaymentSchema,
  PaymentListResponseSchema,
} from '../schemas/subscription.schemas';
import { ErrorResponseSchema } from '../schemas/user.schemas';
import {
  SubscriptionRepository,
  PaymentRepository,
} from '../lib/db/repositories';
import {
  getYooKassaClient,
  getSubscriptionPrice,
  kopecksToRubles,
} from '../lib/yookassa/client';

export const subscriptionApp = new OpenAPIHono();

// Get current subscription
const getCurrentSubscriptionRoute = createRoute({
  method: 'get',
  path: '/current',
  tags: ['Subscriptions'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SubscriptionSchema,
        },
      },
      description: 'Current subscription retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'No active subscription found',
    },
  },
});

subscriptionApp.openapi(getCurrentSubscriptionRoute, authMiddleware, async (c) => {
  const user = c.get('user');

  const subscription = await SubscriptionRepository.findActiveByUserId(user.userId);

  if (!subscription) {
    return c.json({ success: false, error: 'No active subscription found' }, 404);
  }

  return c.json(subscription);
});

// Create subscription
const createSubscriptionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Subscriptions'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSubscriptionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SubscriptionResponseSchema,
        },
      },
      description: 'Subscription created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Bad request',
    },
  },
});

subscriptionApp.openapi(createSubscriptionRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { plan, returnUrl } = c.req.valid('json');

  // Check if user already has an active subscription
  const existingSubscription = await SubscriptionRepository.findActiveByUserId(user.userId);
  if (existingSubscription) {
    return c.json(
      { success: false, error: 'User already has an active subscription' },
      400
    );
  }

  // Calculate subscription period
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month subscription

  // Create subscription
  const subscription = await SubscriptionRepository.create({
    id: `sub_${nanoid(10)}`,
    userId: user.userId,
    plan,
    status: 'trial',
    currentPeriodStart,
    currentPeriodEnd,
    autoRenewal: true,
  });

  // Get price
  const priceInKopecks = getSubscriptionPrice(plan);

  if (priceInKopecks === 0) {
    // Free plan, no payment required
    await SubscriptionRepository.update(subscription.id, { status: 'active' });
    return c.json({ subscription }, 201);
  }

  // Create payment in YooKassa
  const yooKassa = getYooKassaClient();
  const payment = await yooKassa.createPayment({
    amount: {
      value: kopecksToRubles(priceInKopecks),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    capture: true, // Auto-capture payment
    description: `Subscription: ${plan} plan`,
    metadata: {
      subscriptionId: subscription.id,
      userId: user.userId,
    },
    save_payment_method: true, // Save for recurring payments
  });

  // Save payment to database
  await PaymentRepository.create({
    id: `pay_${nanoid(10)}`,
    userId: user.userId,
    subscriptionId: subscription.id,
    yookassaPaymentId: payment.id,
    amount: priceInKopecks,
    currency: 'RUB',
    status: payment.status === 'succeeded' ? 'succeeded' : 'pending',
    description: `Subscription: ${plan} plan`,
    metadata: {},
    confirmationUrl: payment.confirmation?.confirmation_url,
    paid: payment.paid,
    refundable: payment.refundable,
    test: payment.test,
  });

  return c.json(
    {
      subscription,
      paymentUrl: payment.confirmation?.confirmation_url,
    },
    201
  );
});

// Cancel subscription
const cancelSubscriptionRoute = createRoute({
  method: 'post',
  path: '/cancel',
  tags: ['Subscriptions'],
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CancelSubscriptionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SubscriptionSchema,
        },
      },
      description: 'Subscription canceled successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'No active subscription found',
    },
  },
});

subscriptionApp.openapi(cancelSubscriptionRoute, authMiddleware, async (c) => {
  const user = c.get('user');
  const { cancelAtPeriodEnd } = c.req.valid('json');

  const subscription = await SubscriptionRepository.findActiveByUserId(user.userId);

  if (!subscription) {
    return c.json({ success: false, error: 'No active subscription found' }, 404);
  }

  if (cancelAtPeriodEnd) {
    // Cancel at period end
    const updated = await SubscriptionRepository.cancel(subscription.id);
    return c.json(updated);
  } else {
    // Cancel immediately
    const updated = await SubscriptionRepository.update(subscription.id, {
      status: 'canceled',
      cancelAtPeriodEnd: false,
    });
    return c.json(updated);
  }
});

// Reactivate subscription
const reactivateSubscriptionRoute = createRoute({
  method: 'post',
  path: '/reactivate',
  tags: ['Subscriptions'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SubscriptionSchema,
        },
      },
      description: 'Subscription reactivated successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'No subscription found',
    },
  },
});

subscriptionApp.openapi(reactivateSubscriptionRoute, authMiddleware, async (c) => {
  const user = c.get('user');

  const subscription = await SubscriptionRepository.findActiveByUserId(user.userId);

  if (!subscription) {
    return c.json({ success: false, error: 'No subscription found' }, 404);
  }

  if (!subscription.cancelAtPeriodEnd) {
    return c.json({ success: false, error: 'Subscription is not marked for cancellation' }, 400);
  }

  const updated = await SubscriptionRepository.reactivate(subscription.id);
  return c.json(updated);
});

// Get payment history
const getPaymentHistoryRoute = createRoute({
  method: 'get',
  path: '/payments',
  tags: ['Subscriptions'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PaymentListResponseSchema,
        },
      },
      description: 'Payment history retrieved successfully',
    },
  },
});

subscriptionApp.openapi(getPaymentHistoryRoute, authMiddleware, async (c) => {
  const user = c.get('user');

  const payments = await PaymentRepository.findByUserId(user.userId);

  return c.json({
    payments,
    total: payments.length,
  });
});

export default subscriptionApp;
