import { config } from '../../config/env';
import { nanoid } from 'nanoid';

// YooKassa API Types
export interface YooKassaAmount {
  value: string; // Format: "100.00"
  currency: 'RUB';
}

export interface YooKassaConfirmation {
  type: 'redirect';
  return_url: string;
  confirmation_url?: string; // Returned by YooKassa
}

export interface YooKassaRecipient {
  account_id: string;
  gateway_id: string;
}

export interface YooKassaPaymentMethod {
  type: 'bank_card' | 'yoo_money' | 'sberbank' | 'qiwi' | 'alfabank' | 'tinkoff_bank' | 'installments';
  id?: string;
  saved?: boolean;
  title?: string;
}

export interface YooKassaPaymentRequest {
  amount: YooKassaAmount;
  confirmation: YooKassaConfirmation;
  capture?: boolean;
  description?: string;
  metadata?: Record<string, any>;
  receipt?: any;
  save_payment_method?: boolean;
  payment_method_id?: string;
}

export interface YooKassaPaymentResponse {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: YooKassaAmount;
  description?: string;
  recipient?: YooKassaRecipient;
  payment_method?: YooKassaPaymentMethod;
  captured_at?: string;
  created_at: string;
  expires_at?: string;
  confirmation?: YooKassaConfirmation;
  test: boolean;
  refunded_amount?: YooKassaAmount;
  paid: boolean;
  refundable: boolean;
  metadata?: Record<string, any>;
}

export interface YooKassaCaptureRequest {
  amount?: YooKassaAmount;
  receipt?: any;
}

export interface YooKassaCancelRequest {
  // Empty object is valid for cancellation
}

export class YooKassaClient {
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.yookassa.ru/v3';

  constructor(shopId: string, secretKey: string) {
    this.shopId = shopId;
    this.secretKey = secretKey;
  }

  /**
   * Get authorization header for Basic Auth
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make API request to YooKassa
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: any,
    idempotenceKey?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
    };

    // Idempotence key is required for POST requests
    if (method === 'POST') {
      headers['Idempotence-Key'] = idempotenceKey || nanoid(32);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`YooKassa API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Create a payment
   */
  async createPayment(
    data: YooKassaPaymentRequest,
    idempotenceKey?: string
  ): Promise<YooKassaPaymentResponse> {
    return this.request<YooKassaPaymentResponse>(
      'POST',
      '/payments',
      data,
      idempotenceKey
    );
  }

  /**
   * Get payment information
   */
  async getPayment(paymentId: string): Promise<YooKassaPaymentResponse> {
    return this.request<YooKassaPaymentResponse>('GET', `/payments/${paymentId}`);
  }

  /**
   * Capture payment (for two-stage payments with waiting_for_capture status)
   */
  async capturePayment(
    paymentId: string,
    data?: YooKassaCaptureRequest,
    idempotenceKey?: string
  ): Promise<YooKassaPaymentResponse> {
    return this.request<YooKassaPaymentResponse>(
      'POST',
      `/payments/${paymentId}/capture`,
      data || {},
      idempotenceKey
    );
  }

  /**
   * Cancel payment (for waiting_for_capture status)
   */
  async cancelPayment(
    paymentId: string,
    idempotenceKey?: string
  ): Promise<YooKassaPaymentResponse> {
    return this.request<YooKassaPaymentResponse>(
      'POST',
      `/payments/${paymentId}/cancel`,
      {},
      idempotenceKey
    );
  }
}

// Singleton instance
let yooKassaClient: YooKassaClient | null = null;

export function getYooKassaClient(): YooKassaClient {
  if (!yooKassaClient) {
    yooKassaClient = new YooKassaClient(config.YOOKASSA_SHOP_ID, config.YOOKASSA_SECRET_KEY);
  }
  return yooKassaClient;
}

/**
 * Helper function to convert rubles to kopecks (for database storage)
 */
export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}

/**
 * Helper function to convert kopecks to rubles (for YooKassa API)
 */
export function kopecksToRubles(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}

/**
 * Helper function to get subscription prices
 */
export function getSubscriptionPrice(plan: 'free' | 'basic' | 'premium'): number {
  const prices = {
    free: 0,
    basic: 29900, // 299 RUB in kopecks
    premium: 59900, // 599 RUB in kopecks
  };
  return prices[plan];
}
