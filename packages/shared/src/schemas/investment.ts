import { z } from 'zod';

/**
 * Schema for creating a project investment
 */
export const ProjectInvestmentCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.coerce.date(),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().optional().nullable(),
});

/**
 * Schema for updating a project investment
 */
export const ProjectInvestmentUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  note: z.string().optional().nullable(),
});

/**
 * Schema for filtering investments list
 */
export const ProjectInvestmentListFiltersSchema = z.object({
  projectId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
});

// Inferred TypeScript types
export type ProjectInvestmentCreate = z.infer<typeof ProjectInvestmentCreateSchema>;
export type ProjectInvestmentUpdate = z.infer<typeof ProjectInvestmentUpdateSchema>;
export type ProjectInvestmentListFilters = z.infer<typeof ProjectInvestmentListFiltersSchema>;
