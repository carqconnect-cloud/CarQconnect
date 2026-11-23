import crypto from 'crypto';
import { ApiError } from '../../common/utils/apiError';

export interface RazorpayRefundRequest {
  paymentId: string;
  amountInRupees: number;
  reason?: string;
  idempotencyKey: string;
}

export interface RazorpayRefundResponse {
  id: string;
  entity: 'refund';
  amount: number; // in paise
  currency: string;
  payment_id: string;
  status: 'pending' | 'processed' | 'failed';
  created_at: number;
}

export type RazorpayRefundAdapter = (
  req: RazorpayRefundRequest,
) => Promise<RazorpayRefundResponse>;

export interface RazorpayOrderRequest {
  amountInPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: 'order';
  amount: number;
  currency: string;
  receipt?: string;
  status: 'created' | 'attempted' | 'paid';
  created_at: number;
}

export interface RazorpayPaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: 'captured' | 'authorized' | 'failed' | 'refunded';
  orderId?: string;
  notes?: Record<string, string>;
}

export type RazorpayOrderAdapter = (
  req: RazorpayOrderRequest,
) => Promise<RazorpayOrderResponse>;

export type RazorpayPaymentAdapter = (
  paymentId: string,
) => Promise<RazorpayPaymentDetails>;

let customAdapter: RazorpayRefundAdapter | null = null;
let customOrderAdapter: RazorpayOrderAdapter | null = null;
let customPaymentAdapter: RazorpayPaymentAdapter | null = null;

export const razorpayClient = {
  /**
   * Set custom adapter for deterministic testing and sandbox simulation.
   */
  setAdapter(adapter: RazorpayRefundAdapter | null) {
    customAdapter = adapter;
  },

  setOrderAdapter(adapter: RazorpayOrderAdapter | null) {
    customOrderAdapter = adapter;
  },

  setPaymentAdapter(adapter: RazorpayPaymentAdapter | null) {
    customPaymentAdapter = adapter;
  },

  /**
   * Creates an order with Razorpay for one-time checkout.
   */
  async createOrder(input: RazorpayOrderRequest): Promise<RazorpayOrderResponse> {
    if (customOrderAdapter) {
      return customOrderAdapter(input);
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'test') {
        const mockOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
        return {
          id: mockOrderId,
          entity: 'order',
          amount: input.amountInPaise,
          currency: input.currency || 'INR',
          receipt: input.receipt,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000),
        };
      }
      throw ApiError.internal('Payment gateway credentials are not configured. Cannot create order.');
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: input.amountInPaise,
          currency: input.currency || 'INR',
          receipt: input.receipt,
          notes: input.notes,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const desc =
          (data?.error as Record<string, unknown>)?.description ||
          `Razorpay order creation failed with HTTP ${response.status}`;
        throw ApiError.badRequest(`Payment provider rejected order: ${desc}`);
      }

      return {
        id: String(data?.id),
        entity: 'order',
        amount: Number(data?.amount || input.amountInPaise),
        currency: String(data?.currency || 'INR'),
        receipt: data?.receipt ? String(data.receipt) : undefined,
        status: (data?.status as 'created' | 'attempted' | 'paid') || 'created',
        created_at: Number(data?.created_at || Math.floor(Date.now() / 1000)),
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof ApiError) throw err;
      throw ApiError.internal(`Payment provider communication failure: ${(err as Error)?.message || 'Unknown network error'}`);
    }
  },

  /**
   * Fetches payment details from Razorpay to verify capture status and amount.
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPaymentDetails> {
    if (customPaymentAdapter) {
      return customPaymentAdapter(paymentId);
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'test') {
        return {
          id: paymentId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
        };
      }
      throw ApiError.internal('Payment gateway credentials are not configured. Cannot verify payment.');
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: { Authorization: authHeader },
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const desc =
          (data?.error as Record<string, unknown>)?.description ||
          `Razorpay payment lookup failed with HTTP ${response.status}`;
        throw ApiError.badRequest(`Payment provider lookup failed: ${desc}`);
      }

      return {
        id: String(data?.id),
        amount: Number(data?.amount),
        currency: String(data?.currency || 'INR'),
        status: (data?.status as 'captured' | 'authorized' | 'failed' | 'refunded') || 'captured',
        orderId: data?.order_id ? String(data.order_id) : undefined,
        notes: (data?.notes as Record<string, string>) || undefined,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof ApiError) throw err;
      throw ApiError.internal(`Payment provider communication failure: ${(err as Error)?.message || 'Unknown network error'}`);
    }
  },

  /**
   * Verifies Razorpay client-side payment signature.
   */
  verifyPaymentSignature(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    secretOverride?: string;
  }): boolean {
    const secret = params.secretOverride || process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !params.razorpayOrderId || !params.razorpayPaymentId || !params.razorpaySignature) {
      return false;
    }
    try {
      const text = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(Buffer.from(text, 'utf8'))
        .digest('hex');

      if (params.razorpaySignature.length !== expected.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(params.razorpaySignature, 'utf8'),
        Buffer.from(expected, 'utf8'),
      );
    } catch {
      return false;
    }
  },

  /**
   * Dispatches a refund creation request to Razorpay.
   * Per Razorpay API specification:
   * - Endpoint: POST https://api.razorpay.com/v1/payments/:id/refund
   * - Amount is passed in paise (1 INR = 100 paise)
   * - Header: X-Razorpay-Idempotency-Key
   */
  async createRefund(input: RazorpayRefundRequest): Promise<RazorpayRefundResponse> {
    if (customAdapter) {
      return customAdapter(input);
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'test') {
        // In explicitly configured test environment without credentials, simulate safe pending refund with deterministic ID
        const mockId = `rfnd_${crypto.randomBytes(8).toString('hex')}`;
        return {
          id: mockId,
          entity: 'refund',
          amount: Math.round(Number(input.amountInRupees.toFixed(2)) * 100),
          currency: 'INR',
          payment_id: input.paymentId,
          status: 'pending',
          created_at: Math.floor(Date.now() / 1000),
        };
      }

      // In production or any non-test environment, missing credentials must fail safely without generating mock IDs
      throw ApiError.internal('Payment gateway credentials are not configured. Cannot process refund.');
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const amountInPaise = Math.round(Number(input.amountInRupees.toFixed(2)) * 100);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}/refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'X-Razorpay-Idempotency-Key': input.idempotencyKey,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            notes: {
              reason: input.reason || 'Admin initiated order refund',
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (!response.ok) {
        const errorDesc =
          (data?.error as Record<string, unknown>)?.description ||
          `Razorpay refund failed with HTTP ${response.status}`;
        throw ApiError.badRequest(`Payment provider rejected refund: ${errorDesc}`);
      }

      return {
        id: String(data?.id || `rfnd_${crypto.randomBytes(8).toString('hex')}`),
        entity: 'refund',
        amount: Number(data?.amount || amountInPaise),
        currency: String(data?.currency || 'INR'),
        payment_id: input.paymentId,
        status: (data?.status as 'pending' | 'processed' | 'failed') || 'pending',
        created_at: Number(data?.created_at || Math.floor(Date.now() / 1000)),
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof ApiError) throw err;
      const isTimeout = (err as Error)?.name === 'AbortError';
      if (isTimeout) {
        throw ApiError.internal('Payment provider request timed out. Refund remains pending confirmation.');
      }
      throw ApiError.internal(`Payment provider communication failure: ${(err as Error)?.message || 'Unknown network error'}`);
    }
  },

  /**
   * Verifies the authenticity of a Razorpay webhook payload using HMAC-SHA256
   * and timing-safe comparison against the exact raw request buffer.
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string | undefined,
    secretOverride?: string,
  ): boolean {
    const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!signature || !secret || !rawBody) {
      return false;
    }

    try {
      const bodyBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(bodyBuffer)
        .digest('hex');

      if (signature.length !== expected.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expected, 'utf8'),
      );
    } catch {
      return false;
    }
  },
};
