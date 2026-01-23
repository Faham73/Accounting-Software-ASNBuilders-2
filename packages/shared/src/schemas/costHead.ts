import { z } from 'zod';

/**
 * Schema for creating a cost head
 */
export const CostHeadCreateSchema = z.object({
  name: z.string().min(1, 'Cost head name is required'),
  code: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for updating a cost head
 */
export const CostHeadUpdateSchema = z.object({
  name: z.string().min(1, 'Cost head name is required').optional(),
  code: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Inferred TypeScript types
export type CostHeadCreate = z.infer<typeof CostHeadCreateSchema>;
export type CostHeadUpdate = z.infer<typeof CostHeadUpdateSchema>;
