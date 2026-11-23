import { FuelType } from '@prisma/client';
import { z } from 'zod';

export const fuelTypeSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    return val.toUpperCase();
  }
  return val;
}, z.nativeEnum(FuelType, { errorMap: () => ({ message: 'Invalid fuel type. Allowed: PETROL, DIESEL, CNG, ELECTRIC, HYBRID' }) }));

export const vehicleDocumentTypeSchema = z.string().trim().min(1).transform((val) => val.toUpperCase());

export const vehicleDocumentInputSchema = z.object({
  type: vehicleDocumentTypeSchema,
  documentNumber: z.string().trim().max(100).optional(),
  expiryDate: z.string().datetime({ message: 'expiryDate must be an ISO 8601 datetime string' }),
  notes: z.string().trim().max(500).optional(),
});

export const createVehicleSchema = z.object({
  reg: z
    .string()
    .trim()
    .min(2, 'Registration number must be at least 2 characters')
    .max(20, 'Registration number cannot exceed 20 characters')
    .transform((val) => val.toUpperCase()),
  model: z.string().trim().min(1, 'Vehicle model is required').max(100, 'Model cannot exceed 100 characters'),
  fuel: fuelTypeSchema,
  mileage: z.number().positive('Mileage must be a positive number').max(1000, 'Mileage cannot exceed 1000').optional(),
  docExpiry: z.string().datetime({ message: 'docExpiry must be an ISO 8601 datetime string' }).optional().nullable(),
  isDefault: z.boolean().optional(),
  documents: z.array(vehicleDocumentInputSchema).optional(),
});

export const updateVehicleSchema = z.object({
  reg: z
    .string()
    .trim()
    .min(2, 'Registration number must be at least 2 characters')
    .max(20, 'Registration number cannot exceed 20 characters')
    .transform((val) => val.toUpperCase())
    .optional(),
  model: z.string().trim().min(1, 'Vehicle model cannot be empty').max(100, 'Model cannot exceed 100 characters').optional(),
  fuel: fuelTypeSchema.optional(),
  mileage: z.number().positive('Mileage must be a positive number').max(1000, 'Mileage cannot exceed 1000').optional().nullable(),
  docExpiry: z.string().datetime({ message: 'docExpiry must be an ISO 8601 datetime string' }).optional().nullable(),
  isDefault: z.boolean().optional(),
  documents: z.array(vehicleDocumentInputSchema).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleDocumentInput = z.infer<typeof vehicleDocumentInputSchema>;
