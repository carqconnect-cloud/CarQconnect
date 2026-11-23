import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  inStock: z.preprocess((val) => {
    if (val === 'true' || val === true || val === '1' || val === 1) return true;
    if (val === 'false' || val === false || val === '0' || val === 0) return false;
    return undefined;
  }, z.boolean().optional()),
  onSale: z.preprocess((val) => {
    if (val === 'true' || val === true || val === '1' || val === 1) return true;
    if (val === 'false' || val === false || val === '0' || val === 0) return false;
    return undefined;
  }, z.boolean().optional()),
  sortBy: z.enum(['title', 'price', 'category', 'rating', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListProductsQueryInput = z.infer<typeof listProductsQuerySchema>;

export const createProductSchema = z.object({
  title: z.string({ required_error: 'Product title is required' }).trim().min(1, 'Product title cannot be empty').max(200),
  subtitle: z.string().trim().max(200).optional().default(''),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category cannot be empty'),
  price: z.coerce.number({ required_error: 'Price is required' }).min(0, 'Price must be non-negative'),
  originalPrice: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  rating: z.coerce.number().min(0).max(5).optional().default(4.5),
  ratingCount: z.string().trim().optional().default('100+'),
  deliveryDate: z.string().trim().optional().default('2-4 business days'),
  image: z.string().trim().optional().default(''),
  galleryImages: z.array(z.string().trim()).optional().default([]),
  inStock: z.boolean().optional().default(true),
  onSale: z.boolean().optional().default(false),
  fullDescription: z.string().trim().optional().default(''),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  title: z.string().trim().min(1, 'Product title cannot be empty').max(200).optional(),
  subtitle: z.string().trim().max(200).optional(),
  category: z.string().trim().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  originalPrice: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  ratingCount: z.string().trim().optional(),
  deliveryDate: z.string().trim().optional(),
  image: z.string().trim().optional(),
  galleryImages: z.array(z.string().trim()).optional(),
  inStock: z.boolean().optional(),
  onSale: z.boolean().optional(),
  fullDescription: z.string().trim().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const toggleStockSchema = z.object({
  inStock: z.boolean().optional(),
});

export type ToggleStockInput = z.infer<typeof toggleStockSchema>;
