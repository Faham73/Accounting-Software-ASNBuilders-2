import { z } from 'zod';

export const ProjectLaborTypeEnum = z.enum(['DAY', 'MONTHLY']);
export type ProjectLaborType = z.infer<typeof ProjectLaborTypeEnum>;

/**
 * Schema for creating a project labor entry
 */
export const ProjectLaborCreateSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  type: ProjectLaborTypeEnum.default('DAY'),
  date: z.coerce.date(),
  amount: z.number().positive('Amount must be positive'),
  note: z.string().optional().nullable(),
  workerName: z.string().optional().nullable(),
  employeeName: z.string().optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  year: z.number().int().optional().nullable(),
  // DAY labor optional fields
  teamLeader: z.string().optional().nullable(),
  paid: z.number().min(0).optional().default(0),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

/**
 * Schema for updating a project labor entry
 */
export const ProjectLaborUpdateSchema = z.object({
  type: ProjectLaborTypeEnum.optional(),
  date: z.coerce.date().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  note: z.string().optional().nullable(),
  workerName: z.string().optional().nullable(),
  employeeName: z.string().optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  year: z.number().int().optional().nullable(),
  // DAY labor optional fields
  teamLeader: z.string().optional().nullable(),
  paid: z.number().min(0).optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

/**
 * Schema for filtering labor entries list
 */
export const ProjectLaborListFiltersSchema = z.object({
  projectId: z.string().optional(),
  type: ProjectLaborTypeEnum.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
});

// Inferred TypeScript types
export type ProjectLaborCreate = z.infer<typeof ProjectLaborCreateSchema>;
export type ProjectLaborUpdate = z.infer<typeof ProjectLaborUpdateSchema>;
export type ProjectLaborListFilters = z.infer<typeof ProjectLaborListFiltersSchema>;
