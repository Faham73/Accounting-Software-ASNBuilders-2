import { z } from 'zod';

/**
 * Schema for creating a vendor
 */
export const VendorCreateSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for updating a vendor
 */
export const VendorUpdateSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Inferred TypeScript types
export type VendorCreate = z.infer<typeof VendorCreateSchema>;
export type VendorUpdate = z.infer<typeof VendorUpdateSchema>;
