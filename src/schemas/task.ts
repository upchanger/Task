import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(160),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  status: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  startDate: z.string().optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
});

export const commentSchema = z.object({
  message: z.string().trim().min(1, 'Comment cannot be empty').max(4000),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
