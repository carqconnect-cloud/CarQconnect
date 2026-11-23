import { Request, Response } from 'express';
import { storeService } from './store.service';
import { ApiError } from '../../../common/utils/apiError';
import { couponService } from '../../admin/cms/coupon.service';

export const storeController = {
  async getProducts(_req: Request, res: Response) {
    const products = await storeService.getAllProducts();
    res.json({ success: true, data: products });
  },

  async getProduct(req: Request, res: Response) {
    const product = await storeService.getProductById(req.params.id as string);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    res.json({ success: true, data: product });
  },

  async createRazorpayOrder(req: Request, res: Response) {
    const { amount } = req.body;
    if (!amount) throw ApiError.badRequest('Amount is required');
    
    const order = await storeService.createRazorpayOrder(Number(amount));
    res.json({ success: true, data: order });
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
      items,
      totalAmount,
      tagId,
      vehicleReg,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw ApiError.badRequest('Payment details are required');
    }

    const isValid = await storeService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      throw ApiError.badRequest('Invalid payment signature');
    }

    const order = await storeService.createOrder(userId, { 
      addressId, 
      items, 
      totalAmount: Number(totalAmount || 199),
      paymentId: razorpay_payment_id,
      paymentOrderId: razorpay_order_id,
      tagId,
      vehicleReg,
    });
    
    res.json({ success: true, data: order });
  },

  async createOrder(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const { addressId, items, totalAmount, tagId, vehicleReg } = req.body;

    const order = await storeService.createOrder(userId, {
      addressId,
      items,
      totalAmount: Number(totalAmount || 199),
      paymentId: req.body.paymentId || 'COD',
      paymentOrderId: req.body.paymentOrderId || 'CASH_ON_DELIVERY',
      tagId,
      vehicleReg,
    });
    res.json({ success: true, data: order });
  },

  async getOrders(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    if (!userId) throw ApiError.unauthorized();

    const orders = await storeService.getUserOrders(userId);
    res.json({ success: true, data: orders });
  },

  async getActiveCoupons(_req: Request, res: Response) {
    const coupons = await couponService.listActive();
    res.json({ success: true, data: coupons });
  },

  async validateCoupon(req: Request, res: Response) {
    const { code, subtotal } = req.body;
    if (!code) throw ApiError.badRequest('Coupon code is required');
    const result = await couponService.validateCoupon(code, Number(subtotal || 0));
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, data: result });
  },
};
