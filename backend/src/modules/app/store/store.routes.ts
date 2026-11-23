import { Router } from 'express';
import { storeController } from './store.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const storeRouter = Router();

storeRouter.get('/products', asyncHandler(storeController.getProducts));
storeRouter.get('/products/:id', asyncHandler(storeController.getProduct));

storeRouter.get('/coupons', asyncHandler(storeController.getActiveCoupons));
storeRouter.post('/coupons/validate', asyncHandler(storeController.validateCoupon));

storeRouter.post('/orders', asyncHandler(storeController.createOrder));
storeRouter.post('/orders/create-payment-intent', asyncHandler(storeController.createRazorpayOrder));
storeRouter.post('/orders/verify-payment', asyncHandler(storeController.verifyPayment));
storeRouter.get('/orders', asyncHandler(storeController.getOrders));
