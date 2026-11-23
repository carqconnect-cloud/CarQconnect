import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { adminInventoryRepository } from './adminInventory.repository';
import type {
  CreateProductInput,
  ListProductsQueryInput,
  UpdateProductInput,
} from './adminInventory.schema';

export const adminInventoryService = {
  async listProducts(query: ListProductsQueryInput) {
    return adminInventoryRepository.listProducts(query);
  },

  async getProductById(id: string) {
    const product = await adminInventoryRepository.findProductById(id);
    if (!product) {
      throw ApiError.notFound('Product');
    }
    return product;
  },

  async createProduct(input: CreateProductInput, actorId: string, ip?: string) {
    const price = Math.round(input.price);
    const originalPrice = input.originalPrice !== undefined ? Math.round(input.originalPrice) : price;
    const discountPercent =
      input.discountPercent !== undefined
        ? Math.round(input.discountPercent)
        : originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const product = await adminInventoryRepository.createProduct({
      title: input.title,
      subtitle: input.subtitle || '',
      category: input.category,
      price,
      originalPrice,
      discountPercent,
      rating: input.rating ?? 4.5,
      ratingCount: input.ratingCount || '100+',
      deliveryDate: input.deliveryDate || '2-4 business days',
      image: input.image || 'assets/homescreensicons/obd_dongle.png',
      galleryImages: input.galleryImages && input.galleryImages.length ? input.galleryImages : [input.image || 'assets/homescreensicons/obd_dongle.png'],
      inStock: input.inStock ?? true,
      onSale: input.onSale ?? false,
      fullDescription: input.fullDescription || '',
    });

    await auditService.record({
      actorId,
      action: 'INVENTORY_PRODUCT_CREATED',
      entity: 'StoreProduct',
      entityId: product.id,
      metadata: { title: product.title, category: product.category, price: product.price },
      ipAddress: ip,
    });

    return product;
  },

  async updateProduct(id: string, input: UpdateProductInput, actorId: string, ip?: string) {
    const existing = await adminInventoryRepository.findProductById(id);
    if (!existing) {
      throw ApiError.notFound('Product');
    }

    const price = input.price !== undefined ? Math.round(input.price) : existing.price;
    const originalPrice = input.originalPrice !== undefined ? Math.round(input.originalPrice) : existing.originalPrice;
    let discountPercent = input.discountPercent !== undefined ? Math.round(input.discountPercent) : existing.discountPercent;
    if (input.discountPercent === undefined && input.price !== undefined && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    const updated = await adminInventoryRepository.updateProduct(id, {
      title: input.title ?? existing.title,
      subtitle: input.subtitle ?? existing.subtitle,
      category: input.category ?? existing.category,
      price,
      originalPrice,
      discountPercent,
      rating: input.rating ?? existing.rating,
      ratingCount: input.ratingCount ?? existing.ratingCount,
      deliveryDate: input.deliveryDate ?? existing.deliveryDate,
      image: input.image ?? existing.image,
      galleryImages: input.galleryImages ?? existing.galleryImages,
      inStock: input.inStock ?? existing.inStock,
      onSale: input.onSale ?? existing.onSale,
      fullDescription: input.fullDescription ?? existing.fullDescription,
    });

    await auditService.record({
      actorId,
      action: 'INVENTORY_PRODUCT_UPDATED',
      entity: 'StoreProduct',
      entityId: id,
      metadata: { title: updated.title, changes: input },
      ipAddress: ip,
    });

    return updated;
  },

  async deleteProduct(id: string, actorId: string, ip?: string) {
    const existing = await adminInventoryRepository.findProductById(id);
    if (!existing) {
      throw ApiError.notFound('Product');
    }

    await adminInventoryRepository.deleteProduct(id);

    await auditService.record({
      actorId,
      action: 'INVENTORY_PRODUCT_DELETED',
      entity: 'StoreProduct',
      entityId: id,
      metadata: { title: existing.title },
      ipAddress: ip,
    });

    return { id, deleted: true, title: existing.title };
  },

  async toggleStock(id: string, inStock?: boolean, actorId?: string, ip?: string) {
    const existing = await adminInventoryRepository.findProductById(id);
    if (!existing) {
      throw ApiError.notFound('Product');
    }

    const targetStock = inStock !== undefined ? inStock : !existing.inStock;
    const updated = await adminInventoryRepository.updateProduct(id, {
      inStock: targetStock,
    });

    if (actorId) {
      await auditService.record({
        actorId,
        action: 'INVENTORY_STOCK_TOGGLED',
        entity: 'StoreProduct',
        entityId: id,
        metadata: { inStock: targetStock },
        ipAddress: ip,
      });
    }

    return updated;
  },

  async getStockDashboard() {
    return adminInventoryRepository.getDashboardStats();
  },

  // -------------------------------------------------------------------------
  // Stubs for backward compatibility
  // -------------------------------------------------------------------------
  async adjustStock(id: string, input: any, actorId: string, _email?: string, ip?: string) {
    const updated = await adminInventoryRepository.updateStock(id, {
      stockQuantity: input.stockQuantity !== undefined ? Number(input.stockQuantity) : (input.quantity !== undefined ? Number(input.quantity) : undefined),
      reservedQuantity: input.reservedQuantity !== undefined ? Number(input.reservedQuantity) : undefined,
      warehouseLocation: input.warehouseLocation,
      sku: input.sku,
    });

    if (!updated) {
      throw ApiError.notFound('Product');
    }

    if (actorId) {
      await auditService.record({
        actorId,
        action: 'INVENTORY_STOCK_ADJUSTED',
        entity: 'StoreProduct',
        entityId: id,
        metadata: {
          stockQuantity: updated.stockQuantity,
          reservedQuantity: updated.reservedQuantity,
          warehouseLocation: updated.warehouseLocation,
        },
        ipAddress: ip,
      });
    }

    return updated;
  },

  async listSerials(query?: any) {
    const items = await adminInventoryRepository.listAllSerials(query);
    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 50);
    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);
    return {
      items: paginated,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: Math.ceil(items.length / limit) || 1,
      },
    };
  },

  async getProductSerials(productId: string) {
    const p = await adminInventoryRepository.findProductById(productId);
    if (!p) throw ApiError.notFound('Product');
    return {
      productId: p.id,
      title: p.title,
      sku: p.sku,
      warehouseLocation: p.warehouseLocation,
      stockQuantity: p.stockQuantity,
      reservedQuantity: p.reservedQuantity,
      serials: p.serials || [],
    };
  },

  async addProductSerials(productId: string, units: any[], actorId?: string, ip?: string) {
    const updated = await adminInventoryRepository.addProductSerials(productId, units);
    if (!updated) throw ApiError.notFound('Product');

    if (actorId) {
      await auditService.record({
        actorId,
        action: 'INVENTORY_SERIALS_ADDED',
        entity: 'StoreProduct',
        entityId: productId,
        metadata: { addedCount: units.length, newTotalStock: updated.stockQuantity },
        ipAddress: ip,
      });
    }

    return updated;
  },

  async listWarehouses() {
    return [{ id: 'wh-default', name: 'Primary Warehouse', code: 'MAIN-WH', city: 'Indore', state: 'MP', isActive: true }];
  },

  async getWarehouseById(id: string) {
    return { id, name: 'Primary Warehouse', code: 'MAIN-WH', city: 'Indore', state: 'MP', isActive: true };
  },

  async createWarehouse(input: any, _actorId: string, _ip?: string) {
    return { id: 'wh-new', ...input, isActive: true };
  },

  async updateWarehouse(id: string, input: any, _actorId: string, _ip?: string) {
    return { id, ...input };
  },

  async deleteWarehouse(id: string, _actorId: string, _ip?: string) {
    return { id, deleted: true };
  },

  async listMovements(_query: any) {
    return { movements: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  },
};
