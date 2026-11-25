import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(80),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  status: z.enum(['active', 'on_hold', 'completed', 'archived']),
  visibility: z.enum(['workspace', 'private']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a valid hex color'),
  startDate: z.string().optional().or(z.literal('')),
  deadline: z.string().optional().or(z.literal('')),
});

export type ProjectInput = z.infer<typeof projectSchema>;
