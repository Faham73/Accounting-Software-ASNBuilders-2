import { z } from 'zod';

/**
 * Schema for creating a product
 */
export const ProductCreateSchema = z.object({
  code: z.string().min(1, 'Product code is required').trim(),
  name: z.string().min(1, 'Product name is required').trim(),
  unit: z.string().min(1, 'Unit is required'),
  categoryId: z.string().optional().nullable(),
  defaultPurchasePrice: z.number().nonnegative('Purchase price must be non-negative').default(0),
  defaultSalePrice: z.number().nonnegative('Sale price must be non-negative').default(0),
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  isInventory: z.boolean().default(true),
  openingStockQty: z.number().nonnegative('Opening stock quantity must be non-negative').default(0),
  openingStockUnitCost: z.number().nonnegative('Opening stock unit cost must be non-negative').default(0),
  inventoryAccountId: z.string().optional().nullable(),
});

/**
 * Schema for updating a product
 */
export const ProductUpdateSchema = z.object({
  code: z.string().min(1, 'Product code is required').trim().optional(),
  name: z.string().min(1, 'Product name is required').trim().optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  categoryId: z.string().optional().nullable(),
  defaultPurchasePrice: z.number().nonnegative('Purchase price must be non-negative').optional(),
  defaultSalePrice: z.number().nonnegative('Sale price must be non-negative').optional(),
  imageUrl: z.string().url('Image URL must be a valid URL').optional().nullable(),
  isInventory: z.boolean().optional(),
  openingStockQty: z.number().nonnegative('Opening stock quantity must be non-negative').optional(),
  openingStockUnitCost: z.number().nonnegative('Opening stock unit cost must be non-negative').optional(),
  inventoryAccountId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for filtering products list
 */
export const ProductListFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
  categoryId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// Inferred TypeScript types
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductListFilters = z.infer<typeof ProductListFiltersSchema>;
