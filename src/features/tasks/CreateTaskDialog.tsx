import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, type TaskInput } from '@/schemas/task';
import { createTask } from '@/services/firestore/taskService';
import { useAuthStore } from '@/stores/authStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';
import type { ProjectStatusConfig, UserSummary, WorkspaceMember } from '@/types/domain';

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  projectName: string;
  defaultStatus: string;
  statuses: ProjectStatusConfig[];
  members: WorkspaceMember[];
  nextOrder: number;
  canAssignTasks?: boolean;
}

export function CreateTaskDialog({
  open,
  onClose,
  workspaceId,
  projectId,
  projectName,
  defaultStatus,
  statuses,
  members,
  nextOrder,
  canAssignTasks = true,
}: Props) {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const [selectedAssignees, setSelectedAssignees] = React.useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      status: defaultStatus,
      priority: 'medium',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ status: defaultStatus, priority: 'medium', title: '', description: '' });
    }
  }, [open, defaultStatus, reset]);

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const onSubmit = async (data: TaskInput) => {
    if (!firebaseUser) return;
    const assignees: UserSummary[] = members
      .filter((m) => selectedAssignees.includes(m.userId))
      .map((m) => ({
        uid: m.userId,
        displayName: m.displayName,
        photoURL: m.photoURL,
      }));

    try {
      await createTask({
        workspaceId,
        projectId,
        projectName,
        userId: firebaseUser.uid,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        order: nextOrder,
        assignees,
        startDate: data.startDate,
        dueDate: data.dueDate,
      });
      toast.success('Task created');
      setSelectedAssignees([]);
      onClose();
    } catch (err) {
      toast.error('Could not create task', getReadableErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create task" maxWidth="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Task title
          </label>
          <Input placeholder="e.g. Design onboarding flow" {...register('title')} />
          {errors.title && (
            <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Description
          </label>
          <Textarea placeholder="Add context, acceptance criteria, or links..." {...register('description')} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Status
            </label>
            <select
              {...register('status')}
              className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-sm"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Priority
            </label>
            <select
              {...register('priority')}
              className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Start date
            </label>
            <Input type="date" {...register('startDate')} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Due date
            </label>
            <Input type="date" {...register('dueDate')} />
          </div>
        </div>

        {members.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Assignees
            </label>
            {canAssignTasks ? (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const selected = selectedAssignees.includes(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleAssignee(m.userId)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                      }`}
                    >
                      {m.displayName}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Only the workspace owner can assign tasks.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
