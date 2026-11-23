import type { Request, Response } from 'express';
import { StoreOrderStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/apiError';
import { auditService } from '../audit/audit.service';
import { razorpayClient } from './razorpay.client';
import { realTimeService } from '../../common/services/socket.service';

export const webhookController = {
  async handleRazorpayWebhook(req: Request, res: Response) {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = req.body as Buffer | string | undefined;

    if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
      throw ApiError.badRequest('Empty webhook payload');
    }

    if (!signature) {
      throw ApiError.badRequest('Missing Razorpay webhook signature header');
    }

    const isValid = razorpayClient.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw ApiError.badRequest('Invalid Razorpay webhook signature');
    }

    let payload: Record<string, unknown>;
    try {
      const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
      payload = JSON.parse(rawString);
    } catch {
      throw ApiError.badRequest('Malformed JSON in webhook body');
    }

    const event = String(payload.event || '');
    const payloadData = (payload.payload || {}) as Record<string, unknown>;

    // 1. Payment Captured Webhook
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = (payloadData.payment as any)?.entity;
      const paymentId = paymentEntity?.id ? String(paymentEntity.id) : undefined;
      const orderId = paymentEntity?.order_id ? String(paymentEntity.order_id) : undefined;

      if (paymentId || orderId) {
        const storeOrder = await prisma.storeOrder.findFirst({
          where: {
            OR: [
              ...(paymentId ? [{ paymentId }] : []),
              ...(orderId ? [{ paymentOrderId: orderId }] : []),
            ],
          },
        });

        if (storeOrder && storeOrder.status === StoreOrderStatus.PENDING) {
          await prisma.storeOrder.update({
            where: { id: storeOrder.id },
            data: {
              status: StoreOrderStatus.PAID,
              paymentId: paymentId || storeOrder.paymentId,
            },
          });

          await auditService.record({
            action: 'payment.captured',
            entity: 'StoreOrder',
            entityId: storeOrder.id,
            metadata: {
              actor: 'system.razorpay_webhook',
              paymentId,
              orderId,
              event,
            },
            ipAddress: req.ip,
          });

          // Dispatch real-time payment confirmed event
          realTimeService.broadcastOrderUpdate(storeOrder.userId, {
            id: storeOrder.id,
            status: StoreOrderStatus.PAID,
          });
        }
      }

      res.status(200).json({ success: true, received: true, event });
      return;
    }

    // 2. Refund Processed Webhook
    if (event === 'refund.processed') {
      const refundEntity = (payloadData.refund as any)?.entity;
      const gatewayRefundId = refundEntity?.id ? String(refundEntity.id) : undefined;
      const paymentId = refundEntity?.payment_id ? String(refundEntity.payment_id) : undefined;

      if (paymentId) {
        const storeOrder = await prisma.storeOrder.findFirst({
          where: { paymentId },
        });

        if (storeOrder) {
          await prisma.storeOrder.update({
            where: { id: storeOrder.id },
            data: { status: StoreOrderStatus.CANCELLED },
          });

          await auditService.record({
            action: 'payment.refund_processed',
            entity: 'StoreOrder',
            entityId: storeOrder.id,
            metadata: {
              actor: 'system.razorpay_webhook',
              gatewayRefundId,
              paymentId,
              event,
            },
            ipAddress: req.ip,
          });

          // Dispatch real-time payment confirmed event
          realTimeService.broadcastOrderUpdate(storeOrder.userId, {
            id: storeOrder.id,
            status: StoreOrderStatus.PAID,
          });
        }
      }

      res.status(200).json({ success: true, received: true, event });
      return;
    }

    // 3. Refund Failed Webhook
    if (event === 'refund.failed') {
      const refundEntity = (payloadData.refund as any)?.entity;
      const gatewayRefundId = refundEntity?.id ? String(refundEntity.id) : undefined;
      const paymentId = refundEntity?.payment_id ? String(refundEntity.payment_id) : undefined;

      await auditService.record({
        action: 'payment.refund_failed',
        entity: 'StoreOrder',
        metadata: {
          actor: 'system.razorpay_webhook',
          gatewayRefundId,
          paymentId,
          event,
        },
        ipAddress: req.ip,
      });

      res.status(200).json({ success: true, received: true, event });
      return;
    }

    // Default response for unhandled events
    res.status(200).json({ success: true, received: true, unhandledEvent: event });
  },
};
