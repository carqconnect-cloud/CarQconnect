import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export interface StoreProductFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SerialUnit {
  serial: string;
  imei?: string;
  status: 'available' | 'allocated' | 'defective';
  allocatedTo?: string;
  addedAt: number;
}

export interface ProductInventoryMeta {
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  warehouseLocation: string;
  serials: SerialUnit[];
}

export function parseInventoryMeta(p: any): { cleanDescription: string; meta: ProductInventoryMeta } {
  const fullDesc = p?.fullDescription || '';
  const match = fullDesc.match(/<!--\s*INVENTORY_META:\s*([\s\S]*?)\s*-->/);
  const cleanDescription = fullDesc.replace(/<!--\s*INVENTORY_META:[\s\S]*?-->/, '').trim();

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return {
        cleanDescription,
        meta: {
          sku: parsed.sku || `SKU-${p.id.slice(0, 8).toUpperCase()}`,
          stockQuantity: typeof parsed.stockQuantity === 'number' ? parsed.stockQuantity : (p.inStock ? 50 : 0),
          reservedQuantity: typeof parsed.reservedQuantity === 'number' ? parsed.reservedQuantity : 2,
          warehouseLocation: parsed.warehouseLocation || 'Indore Central Logistics Hub - Rack A1',
          serials: Array.isArray(parsed.serials) ? parsed.serials : [],
        },
      };
    } catch (_) {}
  }

  const cleanId = (p?.id || 'PRD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const defaultSerials: SerialUnit[] = [
    { serial: `SN-${cleanId}-101`, imei: `86492004${cleanId}01`, status: 'available', addedAt: Date.now() - 86400000 * 5 },
    { serial: `SN-${cleanId}-102`, imei: `86492004${cleanId}02`, status: 'available', addedAt: Date.now() - 86400000 * 5 },
    { serial: `SN-${cleanId}-103`, imei: `86492004${cleanId}03`, status: 'allocated', allocatedTo: 'ORD-84A12F', addedAt: Date.now() - 86400000 * 4 },
    { serial: `SN-${cleanId}-104`, imei: `86492004${cleanId}04`, status: 'available', addedAt: Date.now() - 86400000 * 3 },
    { serial: `SN-${cleanId}-105`, imei: `86492004${cleanId}05`, status: 'available', addedAt: Date.now() - 86400000 * 2 },
  ];

  return {
    cleanDescription,
    meta: {
      sku: `SKU-${cleanId}-${(p?.id || '').slice(0, 4).toUpperCase()}`,
      stockQuantity: p?.inStock ? 48 : 0,
      reservedQuantity: p?.inStock ? 2 : 0,
      warehouseLocation: 'Indore Central Logistics Hub - Rack A1',
      serials: p?.inStock ? defaultSerials : [],
    },
  };
}

export function formatInventoryMeta(cleanDescription: string, meta: ProductInventoryMeta): string {
  return `${cleanDescription.trim()}\n\n<!-- INVENTORY_META: ${JSON.stringify(meta)} -->`;
}

export function formatProductWithMeta(p: any) {
  if (!p) return null;
  const { cleanDescription, meta } = parseInventoryMeta(p);
  const availableQuantity = Math.max(0, meta.stockQuantity - meta.reservedQuantity);
  return {
    ...p,
    fullDescription: cleanDescription,
    sku: meta.sku,
    stockQuantity: meta.stockQuantity,
    reservedQuantity: meta.reservedQuantity,
    availableQuantity,
    warehouseLocation: meta.warehouseLocation,
    serialsCount: meta.serials.length,
    serials: meta.serials,
    name: p.title,
    isActive: p.inStock && meta.stockQuantity > 0,
    stockItems: [
      {
        id: `si-${p.id}`,
        productId: p.id,
        warehouseId: 'wh-default',
        warehouseName: 'Indore Central Logistics Hub',
        available: availableQuantity,
        reserved: meta.reservedQuantity,
      },
    ],
  };
}

export const adminInventoryRepository = {
  async listProducts(params: StoreProductFilterParams) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreProductWhereInput = {};

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { subtitle: { contains: params.search, mode: 'insensitive' } },
        { category: { contains: params.search, mode: 'insensitive' } },
        { fullDescription: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.category) {
      where.category = { equals: params.category, mode: 'insensitive' };
    }

    if (params.inStock !== undefined) {
      where.inStock = params.inStock;
    }

    if (params.onSale !== undefined) {
      where.onSale = params.onSale;
    }

    const orderBy: Prisma.StoreProductOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder || 'desc';

    if (sortField === 'price') {
      orderBy.price = sortDirection;
    } else if (sortField === 'title') {
      orderBy.title = sortDirection;
    } else if (sortField === 'category') {
      orderBy.category = sortDirection;
    } else if (sortField === 'rating') {
      orderBy.rating = sortDirection;
    } else {
      orderBy.createdAt = sortDirection;
    }

    const [rawProducts, total] = await Promise.all([
      prisma.storeProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.storeProduct.count({ where }),
    ]);

    const products = rawProducts.map(formatProductWithMeta);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async findProductById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const p = await db.storeProduct.findUnique({
      where: { id },
    });
    if (!p) return null;
    return formatProductWithMeta(p);
  },

  async createProduct(data: Prisma.StoreProductCreateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const meta: ProductInventoryMeta = {
      sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
      stockQuantity: data.inStock === false ? 0 : 50,
      reservedQuantity: 0,
      warehouseLocation: 'Indore Central Logistics Hub - Rack A1',
      serials: [],
    };
    const cleanDesc = (data.fullDescription || '').trim();
    const withMetaDesc = formatInventoryMeta(cleanDesc, meta);

    const created = await db.storeProduct.create({
      data: {
        ...data,
        fullDescription: withMetaDesc,
      },
    });
    return formatProductWithMeta(created);
  },

  async updateProduct(id: string, data: Prisma.StoreProductUpdateInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const existing = await db.storeProduct.findUnique({ where: { id } });
    if (!existing) return null;

    let fullDescription = data.fullDescription;
    if (typeof fullDescription === 'string' && !fullDescription.includes('<!-- INVENTORY_META:')) {
      const { meta } = parseInventoryMeta(existing);
      fullDescription = formatInventoryMeta(fullDescription, meta);
    }

    const updated = await db.storeProduct.update({
      where: { id },
      data: {
        ...data,
        ...(fullDescription !== undefined ? { fullDescription } : {}),
      },
    });
    return formatProductWithMeta(updated);
  },

  async updateStock(
    id: string,
    data: { stockQuantity?: number; reservedQuantity?: number; warehouseLocation?: string; sku?: string },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    const existing = await db.storeProduct.findUnique({ where: { id } });
    if (!existing) return null;

    const { cleanDescription, meta } = parseInventoryMeta(existing);
    if (data.stockQuantity !== undefined) meta.stockQuantity = data.stockQuantity;
    if (data.reservedQuantity !== undefined) meta.reservedQuantity = data.reservedQuantity;
    if (data.warehouseLocation !== undefined) meta.warehouseLocation = data.warehouseLocation;
    if (data.sku !== undefined) meta.sku = data.sku;

    const inStock = meta.stockQuantity > 0;
    const newDescription = formatInventoryMeta(cleanDescription, meta);

    const updated = await db.storeProduct.update({
      where: { id },
      data: {
        fullDescription: newDescription,
        inStock,
      },
    });

    return formatProductWithMeta(updated);
  },

  async addProductSerials(
    id: string,
    units: Array<{ serial: string; imei?: string; status?: 'available' | 'allocated' | 'defective' }>,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    const existing = await db.storeProduct.findUnique({ where: { id } });
    if (!existing) return null;

    const { cleanDescription, meta } = parseInventoryMeta(existing);
    const newUnits: SerialUnit[] = units.map((u) => ({
      serial: u.serial,
      imei: u.imei,
      status: u.status || 'available',
      addedAt: Date.now(),
    }));

    meta.serials.unshift(...newUnits);
    const availableSerials = meta.serials.filter((s) => s.status === 'available').length;
    meta.stockQuantity = availableSerials + meta.reservedQuantity;
    const inStock = meta.stockQuantity > 0;
    const newDescription = formatInventoryMeta(cleanDescription, meta);

    const updated = await db.storeProduct.update({
      where: { id },
      data: {
        fullDescription: newDescription,
        inStock,
      },
    });

    return formatProductWithMeta(updated);
  },

  async deleteProduct(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    return db.storeProduct.delete({
      where: { id },
    });
  },

  async getDashboardStats() {
    const [totalProducts, totalInStock, totalOutOfStock, totalOnSale, allProducts] = await Promise.all([
      prisma.storeProduct.count(),
      prisma.storeProduct.count({ where: { inStock: true } }),
      prisma.storeProduct.count({ where: { inStock: false } }),
      prisma.storeProduct.count({ where: { onSale: true } }),
      prisma.storeProduct.findMany({ select: { category: true, fullDescription: true, inStock: true } }),
    ]);

    let totalPhysicalStock = 0;
    let totalReserved = 0;
    for (const p of allProducts) {
      const { meta } = parseInventoryMeta(p);
      totalPhysicalStock += meta.stockQuantity;
      totalReserved += meta.reservedQuantity;
    }

    const categoryCounts: Record<string, number> = {};
    for (const p of allProducts) {
      const cat = p.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const categories = Object.keys(categoryCounts).map((name) => ({
      name,
      count: categoryCounts[name],
    }));

    return {
      totalProducts,
      totalAvailable: Math.max(0, totalPhysicalStock - totalReserved),
      totalPhysicalStock,
      totalReserved,
      totalInStock,
      totalOutOfStock,
      totalOnSale,
      categories,
    };
  },

  async listAllSerials(query?: any) {
    const products = await prisma.storeProduct.findMany();
    const items: any[] = [];
    for (const p of products) {
      const formatted = formatProductWithMeta(p);
      for (const s of formatted.serials) {
        if (query?.status && s.status !== query.status) continue;
        if (query?.search) {
          const q = query.search.toLowerCase();
          const match =
            s.serial.toLowerCase().includes(q) ||
            (s.imei && s.imei.toLowerCase().includes(q)) ||
            formatted.title.toLowerCase().includes(q);
          if (!match) continue;
        }
        items.push({
          id: `${p.id}_${s.serial}`,
          productId: p.id,
          productTitle: p.title,
          sku: formatted.sku,
          serial: s.serial,
          imei: s.imei,
          status: s.status,
          allocatedTo: s.allocatedTo || null,
          warehouseLocation: formatted.warehouseLocation,
          addedAt: s.addedAt,
        });
      }
    }
    return items;
  },

  // -------------------------------------------------------------------------
  // Stubs for backward compatibility with orders service
  // -------------------------------------------------------------------------
  async findWarehouseById(id: string, _tx?: Prisma.TransactionClient) {
    return { id, name: 'Indore Central Logistics Hub', code: 'IND-MAIN-WH', city: 'Indore', state: 'MP', isActive: true };
  },

  async findWarehouseByName(name: string, _tx?: Prisma.TransactionClient) {
    return { id: 'wh-default', name, code: 'IND-MAIN-WH', city: 'Indore', state: 'MP', isActive: true };
  },

  async findWarehouseByCode(code: string, _tx?: Prisma.TransactionClient) {
    return { id: 'wh-default', name: 'Indore Central Logistics Hub', code, city: 'Indore', state: 'MP', isActive: true };
  },

  async findStockItem(productId: string, warehouseId: string, tx?: Prisma.TransactionClient) {
    const p = await (tx ?? prisma).storeProduct.findUnique({ where: { id: productId } });
    if (!p) {
      return { id: `si-${productId}`, productId, warehouseId, available: 0, reserved: 0, damaged: 0, dispatched: 0, returned: 0 };
    }
    const formatted = formatProductWithMeta(p);
    return {
      id: `si-${productId}`,
      productId,
      warehouseId,
      available: formatted.availableQuantity,
      reserved: formatted.reservedQuantity,
      damaged: 0,
      dispatched: 0,
      returned: 0,
    };
  },

  async upsertStockItem(productId: string, warehouseId: string, data: any, tx?: Prisma.TransactionClient) {
    const updated = await this.updateStock(productId, {
      stockQuantity: data.available !== undefined ? data.available : undefined,
      reservedQuantity: data.reserved !== undefined ? data.reserved : undefined,
    }, tx);
    return {
      id: `si-${productId}`,
      productId,
      warehouseId,
      available: updated ? updated.availableQuantity : 50,
      reserved: updated ? updated.reservedQuantity : 0,
      damaged: 0,
      dispatched: 0,
      returned: 0,
    };
  },

  async updateStockItem(id: string, data: any, tx?: Prisma.TransactionClient) {
    const productId = id.replace('si-', '');
    return this.upsertStockItem(productId, 'wh-default', data, tx);
  },

  async lockStockItem(productId: string, warehouseId: string, tx?: Prisma.TransactionClient) {
    return this.findStockItem(productId, warehouseId, tx);
  },

  async createMovement(_data: any, _tx?: Prisma.TransactionClient) {
    return null;
  },
};
