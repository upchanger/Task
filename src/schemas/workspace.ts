import { z } from 'zod';

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(60),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  role: z.enum(['admin', 'member']),
});

export type WorkspaceInput = z.infer<typeof workspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
