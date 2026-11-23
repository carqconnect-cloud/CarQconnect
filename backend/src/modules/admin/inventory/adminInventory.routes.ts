import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminInventoryController } from './adminInventory.controller';
import {
  createProductSchema,
  listProductsQuerySchema,
  toggleStockSchema,
  updateProductSchema,
} from './adminInventory.schema';

export const adminInventoryRoutes = Router();

// Store Products (Unified Catalogue)
adminInventoryRoutes.get(
  '/products',
  validate({ query: listProductsQuerySchema }),
  asyncHandler(adminInventoryController.listProducts),
);

adminInventoryRoutes.post(
  '/products',
  validate({ body: createProductSchema }),
  asyncHandler(adminInventoryController.createProduct),
);

adminInventoryRoutes.get(
  '/products/:id',
  asyncHandler(adminInventoryController.getProductById),
);

adminInventoryRoutes.put(
  '/products/:id',
  validate({ body: updateProductSchema }),
  asyncHandler(adminInventoryController.updateProduct),
);

adminInventoryRoutes.delete(
  '/products/:id',
  asyncHandler(adminInventoryController.deleteProduct),
);

adminInventoryRoutes.patch(
  '/products/:id/stock',
  validate({ body: toggleStockSchema }),
  asyncHandler(adminInventoryController.toggleStock),
);

adminInventoryRoutes.post(
  '/products/:id/adjust',
  asyncHandler(adminInventoryController.adjustStock),
);

adminInventoryRoutes.get(
  '/products/:id/serials',
  asyncHandler(adminInventoryController.getProductSerials),
);

adminInventoryRoutes.post(
  '/products/:id/serials',
  asyncHandler(adminInventoryController.addProductSerials),
);

// Stock Dashboard
adminInventoryRoutes.get(
  '/stock-dashboard',
  asyncHandler(adminInventoryController.getStockDashboard),
);

adminInventoryRoutes.get(
  '/stock',
  asyncHandler(adminInventoryController.getStockDashboard),
);

// Backward-compatibility endpoints
adminInventoryRoutes.get(
  '/warehouses',
  asyncHandler(adminInventoryController.listWarehouses),
);

adminInventoryRoutes.get(
  '/warehouses/:id',
  asyncHandler(adminInventoryController.getWarehouseById),
);

adminInventoryRoutes.post(
  '/warehouses',
  asyncHandler(adminInventoryController.createWarehouse),
);

adminInventoryRoutes.put(
  '/warehouses/:id',
  asyncHandler(adminInventoryController.updateWarehouse),
);

adminInventoryRoutes.delete(
  '/warehouses/:id',
  asyncHandler(adminInventoryController.deleteWarehouse),
);

adminInventoryRoutes.get(
  '/movements',
  asyncHandler(adminInventoryController.listMovements),
);

adminInventoryRoutes.get(
  '/serial-imei',
  asyncHandler(adminInventoryController.listSerials),
);
