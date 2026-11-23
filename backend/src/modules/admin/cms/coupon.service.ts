import fs from 'fs';
import path from 'path';
import { prisma } from '../../../config/database';

export interface CouponItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  schedule: string;
  status: 'active' | 'paused' | 'expired';
  createdAt: number;
  updatedAt?: number;
}

const COUPONS_FILE = path.resolve(__dirname, '../../../data/coupons.json');

function readCouponsFromFile(): CouponItem[] {
  try {
    const dir = path.dirname(COUPONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(COUPONS_FILE)) {
      fs.writeFileSync(COUPONS_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(COUPONS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Failed reading coupons file:', err);
    return [];
  }
}

function writeCouponsToFile(coupons: CouponItem[]): void {
  try {
    const dir = path.dirname(COUPONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(COUPONS_FILE, JSON.stringify(coupons, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed writing coupons file:', err);
  }
}

function mapPrismaToCoupon(pc: any): CouponItem {
  return {
    id: pc.id,
    code: (pc.code || '').toUpperCase(),
    title: pc.title || `${pc.code} Offer`,
    description: pc.description || '',
    discountType: pc.discountType === 'FLAT' ? 'FLAT' : 'PERCENT',
    discountValue: Number(pc.discountValue || 0),
    minOrder: Number(pc.minOrder || 0),
    maxDiscount: pc.maxDiscount != null ? Number(pc.maxDiscount) : 500,
    usageLimit: Number(pc.usageLimit || 500),
    usedCount: Number(pc.usedCount || 0),
    schedule: pc.schedule || 'Ongoing',
    status: pc.status === 'paused' || pc.status === 'expired' ? pc.status : 'active',
    createdAt: pc.createdAt ? new Date(pc.createdAt).getTime() : Date.now(),
    updatedAt: pc.updatedAt ? new Date(pc.updatedAt).getTime() : Date.now(),
  };
}

export const couponService = {
  async listAll(query?: { search?: string; status?: string }): Promise<CouponItem[]> {
    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        const where: any = {};
        if (query?.status) where.status = query.status;
        if (query?.search) {
          where.OR = [
            { code: { contains: query.search, mode: 'insensitive' } },
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ];
        }
        const dbItems = await pc.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        });
        if (Array.isArray(dbItems) && dbItems.length > 0) {
          const mapped = dbItems.map(mapPrismaToCoupon);
          writeCouponsToFile(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('Prisma coupon query fallback to file:', (err as any)?.message || err);
    }

    let list = readCouponsFromFile();
    if (query?.status) {
      list = list.filter((c) => c.status === query.status);
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }
    return list;
  },

  async listActive(): Promise<CouponItem[]> {
    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        const dbItems = await pc.findMany({
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
        });
        if (Array.isArray(dbItems) && dbItems.length > 0) {
          return dbItems.map(mapPrismaToCoupon);
        }
      }
    } catch (err) {
      console.warn('Prisma active coupon query fallback to file:', (err as any)?.message || err);
    }

    const list = readCouponsFromFile();
    return list.filter((c) => c.status === 'active');
  },

  async getById(id: string): Promise<CouponItem | null> {
    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        const found = await pc.findUnique({ where: { id } });
        if (found) return mapPrismaToCoupon(found);
      }
    } catch (_) {}

    const list = readCouponsFromFile();
    return list.find((c) => c.id === id) || null;
  },

  async getByCode(code: string): Promise<CouponItem | null> {
    const upper = (code || '').trim().toUpperCase();
    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        const found = await pc.findUnique({ where: { code: upper } });
        if (found) return mapPrismaToCoupon(found);
      }
    } catch (_) {}

    const list = readCouponsFromFile();
    return list.find((c) => c.code.toUpperCase() === upper) || null;
  },

  async create(input: Partial<CouponItem>): Promise<CouponItem> {
    const code = (input.code || '').trim().toUpperCase();
    if (!code) throw new Error('Coupon code is required');

    const newCoupon: CouponItem = {
      id: input.id || 'cpn_' + Date.now().toString(36),
      code,
      title: input.title || `${code} Promotional Offer`,
      description: input.description || input.title || '',
      discountType: input.discountType === 'FLAT' ? 'FLAT' : 'PERCENT',
      discountValue: Number(input.discountValue) || 10,
      minOrder: Number(input.minOrder) || 0,
      maxDiscount: input.maxDiscount ? Number(input.maxDiscount) : 500,
      usageLimit: Number(input.usageLimit) || 500,
      usedCount: Number(input.usedCount) || 0,
      schedule: input.schedule || 'Ongoing',
      status: input.status === 'paused' || input.status === 'expired' ? input.status : 'active',
      createdAt: input.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // 1. Save in PostgreSQL Database via Prisma
    let dbSaved: any = null;
    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        dbSaved = await pc.upsert({
          where: { code },
          update: {
            title: newCoupon.title,
            description: newCoupon.description,
            discountType: newCoupon.discountType,
            discountValue: newCoupon.discountValue,
            minOrder: newCoupon.minOrder,
            maxDiscount: newCoupon.maxDiscount,
            usageLimit: newCoupon.usageLimit,
            usedCount: newCoupon.usedCount,
            schedule: newCoupon.schedule,
            status: newCoupon.status,
          },
          create: {
            id: newCoupon.id,
            code: newCoupon.code,
            title: newCoupon.title,
            description: newCoupon.description,
            discountType: newCoupon.discountType,
            discountValue: newCoupon.discountValue,
            minOrder: newCoupon.minOrder,
            maxDiscount: newCoupon.maxDiscount,
            usageLimit: newCoupon.usageLimit,
            usedCount: newCoupon.usedCount,
            schedule: newCoupon.schedule,
            status: newCoupon.status,
          },
        });
      }
    } catch (err) {
      console.warn('Prisma coupon upsert fallback:', (err as any)?.message || err);
    }

    // 2. Dual-save in durable local file
    const list = readCouponsFromFile();
    const existingIndex = list.findIndex((c) => c.code.toUpperCase() === code);
    if (existingIndex >= 0 && list[existingIndex]) {
      const existing = list[existingIndex]!;
      list[existingIndex] = { ...existing, ...newCoupon, id: dbSaved?.id || existing.id };
    } else {
      list.unshift(dbSaved ? mapPrismaToCoupon(dbSaved) : newCoupon);
    }
    writeCouponsToFile(list);

    return dbSaved ? mapPrismaToCoupon(dbSaved) : newCoupon;
  },

  async toggleStatus(id: string): Promise<CouponItem | null> {
    const list = readCouponsFromFile();
    const index = list.findIndex((c) => c.id === id);
    let newStatus: 'active' | 'paused' = 'active';

    if (index >= 0 && list[index]) {
      newStatus = list[index]!.status === 'active' ? 'paused' : 'active';
      list[index]!.status = newStatus;
      list[index]!.updatedAt = Date.now();
      writeCouponsToFile(list);
    }

    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        const updated = await pc.update({
          where: { id },
          data: { status: newStatus },
        });
        return mapPrismaToCoupon(updated);
      }
    } catch (err) {
      console.warn('Prisma coupon status update fallback:', (err as any)?.message || err);
    }

    return index >= 0 && list[index] ? list[index]! : null;
  },

  async delete(id: string): Promise<boolean> {
    let deletedFromDb = false;
    try {
      const pc = (prisma as any)?.coupon;
      if (pc) {
        await pc.delete({ where: { id } });
        deletedFromDb = true;
      }
    } catch (err) {
      console.warn('Prisma coupon delete fallback:', (err as any)?.message || err);
    }

    let list = readCouponsFromFile();
    const beforeCount = list.length;
    list = list.filter((c) => c.id !== id);
    if (list.length !== beforeCount || deletedFromDb) {
      writeCouponsToFile(list);
      return true;
    }
    return false;
  },

  async validateCoupon(code: string, subtotal: number) {
    let coupon = await this.getByCode(code);
    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }
    if (coupon.status !== 'active') {
      return { valid: false, message: 'This coupon is not active or has expired' };
    }
    if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
      return {
        valid: false,
        message: `Minimum order amount of ₹${coupon.minOrder} is required for this coupon`,
      };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, message: 'Coupon usage limit has been reached' };
    }

    let discount = 0;
    if (coupon.discountType === 'FLAT') {
      discount = coupon.discountValue;
    } else {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && coupon.maxDiscount > 0) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    }
    discount = Math.min(discount, subtotal);

    return {
      valid: true,
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      minOrder: coupon.minOrder,
      coupon,
    };
  },
};
