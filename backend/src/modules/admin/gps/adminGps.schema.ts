import { z } from 'zod';

export const listAdminGpsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'unassigned', 'maintenance', 'deactivated']).optional(),
  sortBy: z.enum(['createdAt', 'imei', 'lastSeenAt', 'status', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const registerGpsDeviceSchema = z.object({
  imei: z
    .string({ required_error: 'IMEI is required' })
    .trim()
    .min(1, 'IMEI cannot be empty')
    .max(50, 'IMEI cannot exceed 50 characters'),
  serialNumber: z
    .string()
    .trim()
    .min(1, 'Serial number cannot be empty')
    .max(50, 'Serial number cannot exceed 50 characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  model: z
    .string()
    .trim()
    .max(100, 'Model cannot exceed 100 characters')
    .optional(),
  vendor: z
    .string()
    .trim()
    .max(100, 'Vendor cannot exceed 100 characters')
    .optional(),
});

export const assignGpsSchema = z.object({
  vehicleId: z
    .string({ required_error: 'Target vehicleId is required' })
    .trim()
    .min(1, 'Vehicle ID cannot be empty'),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const unbindGpsSchema = z.object({
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const deactivateGpsSchema = z.object({
  reason: z.string().trim().max(255, 'Reason cannot exceed 255 characters').optional(),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export const createGeofenceSchema = z.object({
  name: z
    .string({ required_error: 'Geofence name is required' })
    .trim()
    .min(1, 'Geofence name cannot be empty')
    .max(100, 'Geofence name cannot exceed 100 characters'),
  latitude: z
    .number({ required_error: 'Latitude is required' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radiusMeters: z
    .number({ required_error: 'Radius in meters is required' })
    .positive('Radius must be a positive number'),
  isActive: z.boolean().optional(),
});

export const recordTelemetrySchema = z.object({
  imei: z.string({ required_error: 'IMEI is required' }).trim().min(1, 'IMEI cannot be empty'),
  latitude: z.number({ required_error: 'Latitude is required' }).min(-90).max(90),
  longitude: z.number({ required_error: 'Longitude is required' }).min(-180).max(180),
  speed: z.number().min(0).optional().default(0),
  heading: z.number().min(0).max(360).optional().default(0),
  batteryLevel: z.number().int().min(0).max(100).optional().default(90),
  signalStrength: z.string().trim().optional().default('Strong'),
  altitude: z.number().optional(),
  timestamp: z.string().optional(),
});

export type ListAdminGpsQuery = z.infer<typeof listAdminGpsQuerySchema>;
export type RegisterGpsDeviceInput = z.infer<typeof registerGpsDeviceSchema>;
export type AssignGpsInput = z.infer<typeof assignGpsSchema>;
export type UnbindGpsInput = z.infer<typeof unbindGpsSchema>;
export type DeactivateGpsInput = z.infer<typeof deactivateGpsSchema>;
export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;
export type RecordTelemetryInput = z.infer<typeof recordTelemetrySchema>;
