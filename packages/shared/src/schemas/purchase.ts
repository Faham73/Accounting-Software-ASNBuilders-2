import { z } from 'zod';

/**
 * Purchase status enum values
 */
export const PurchaseStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REVERSED']);

/**
 * Warehouse type enum values
 */
export const WarehouseTypeEnum = z.enum(['LOCAL', 'COMPANY']);

/**
 * Schema for creating a purchase line
 */
export const PurchaseLineCreateSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  lineTotal: z.number().nonnegative('Line total must be non-negative'),
});

/**
 * Schema for creating a purchase attachment
 */
export const PurchaseAttachmentCreateSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('File URL must be a valid URL'),
  mimeType: z.string().min(1, 'MIME type is required'),
  sizeBytes: z.number().int().positive('Size must be a positive integer'),
});

/**
 * Schema for creating a purchase
 */
export const PurchaseCreateSchema = z.object({
  date: z.coerce.date(),
  challanNo: z.string().optional().nullable(),
  projectId: z.string().min(1, 'Main project is required'),
  subProjectId: z.string().optional().nullable(),
  supplierVendorId: z.string().min(1, 'Supplier is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  reference: z.string().optional().nullable(),
  discountPercent: z.number().nonnegative().max(100).optional().nullable(),
  paidAmount: z.number().nonnegative('Paid amount must be non-negative').default(0),
  paymentAccountId: z.string().optional().nullable(),
  lines: z.array(PurchaseLineCreateSchema).min(1, 'At least one purchase line is required'),
  attachments: z.array(PurchaseAttachmentCreateSchema).optional().default([]),
})
  .refine(
    (data) => {
      // Validate that paidAmount doesn't exceed total (computed server-side, but validate here for UX)
      const subtotal = data.lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const discount = data.discountPercent ? (subtotal * data.discountPercent / 100) : 0;
      const total = subtotal - discount;
      return data.paidAmount <= total;
    },
    { message: 'Paid amount cannot exceed total amount' }
  )
  .refine(
    (data) => {
      // Payment account is required when paid amount > 0
      if (data.paidAmount > 0 && !data.paymentAccountId) {
        return false;
      }
      return true;
    },
    {
      message: 'Payment account is required when paid amount > 0',
      path: ['paymentAccountId'],
    }
  );

/**
 * Schema for updating a purchase
 */
export const PurchaseUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  challanNo: z.string().optional().nullable(),
  projectId: z.string().min(1, 'Main project is required').optional(),
  subProjectId: z.string().optional().nullable(),
  supplierVendorId: z.string().min(1, 'Supplier is required').optional(),
  warehouseId: z.string().min(1, 'Warehouse is required').optional(),
  reference: z.string().optional().nullable(),
  discountPercent: z.number().nonnegative().max(100).optional().nullable(),
  paidAmount: z.number().nonnegative('Paid amount must be non-negative').optional(),
  paymentAccountId: z.string().optional().nullable(),
  lines: z.array(PurchaseLineCreateSchema).min(1, 'At least one purchase line is required').optional(),
  attachments: z.array(PurchaseAttachmentCreateSchema).optional(),
})
  .refine(
    (data) => {
      if (!data.lines || !data.paidAmount) return true;
      const subtotal = data.lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const discount = data.discountPercent ? (subtotal * data.discountPercent / 100) : 0;
      const total = subtotal - discount;
      return data.paidAmount <= total;
    },
    { message: 'Paid amount cannot exceed total amount' }
  )
  .refine(
    (data) => {
      // Payment account is required when paid amount > 0
      if (data.paidAmount && data.paidAmount > 0 && !data.paymentAccountId) {
        return false;
      }
      return true;
    },
    {
      message: 'Payment account is required when paid amount > 0',
      path: ['paymentAccountId'],
    }
  );

/**
 * Schema for filtering purchases list
 */
export const PurchaseListFiltersSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
  projectId: z.string().optional(),
  supplierId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

// Inferred TypeScript types
export type PurchaseLineCreate = z.infer<typeof PurchaseLineCreateSchema>;
export type PurchaseAttachmentCreate = z.infer<typeof PurchaseAttachmentCreateSchema>;
export type PurchaseCreate = z.infer<typeof PurchaseCreateSchema>;
export type PurchaseUpdate = z.infer<typeof PurchaseUpdateSchema>;
export type PurchaseListFilters = z.infer<typeof PurchaseListFiltersSchema>;
export type PurchaseStatus = z.infer<typeof PurchaseStatusEnum>;
export type WarehouseType = z.infer<typeof WarehouseTypeEnum>;
