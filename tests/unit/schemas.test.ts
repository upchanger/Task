import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '@/schemas/auth';
import { workspaceSchema, inviteMemberSchema } from '@/schemas/workspace';
import { projectSchema } from '@/schemas/project';
import { taskSchema } from '@/schemas/task';

describe('Zod validation schemas', () => {
  it('validates login credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'secret12' }).success).toBe(
      true,
    );
    expect(loginSchema.safeParse({ email: 'bad-email', password: '123' }).success).toBe(false);
  });

  it('enforces strong password and matching confirmation on register', () => {
    const valid = registerSchema.safeParse({
      displayName: 'Alex Rivera',
      email: 'alex@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    expect(valid.success).toBe(true);

    const mismatch = registerSchema.safeParse({
      displayName: 'Alex Rivera',
      email: 'alex@example.com',
      password: 'Password1',
      confirmPassword: 'Password2',
    });
    expect(mismatch.success).toBe(false);
  });

  it('validates workspace and invite payloads', () => {
    expect(workspaceSchema.safeParse({ name: 'Design Studio' }).success).toBe(true);
    expect(workspaceSchema.safeParse({ name: 'A' }).success).toBe(false);
    expect(
      inviteMemberSchema.safeParse({ email: 'team@example.com', role: 'admin' }).success,
    ).toBe(true);
    expect(
      inviteMemberSchema.safeParse({ email: 'team@example.com', role: 'owner' }).success,
    ).toBe(false);
  });

  it('validates project and task payloads', () => {
    expect(
      projectSchema.safeParse({
        name: 'Launch Q4',
        status: 'active',
        visibility: 'workspace',
        color: '#C85A32',
      }).success,
    ).toBe(true);

    expect(
      taskSchema.safeParse({
        title: 'Ship Kanban board',
        status: 'todo',
        priority: 'high',
      }).success,
    ).toBe(true);
  });
});
