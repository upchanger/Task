import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectInput } from '@/schemas/project';
import { createProject } from '@/services/firestore/projectService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

const PROJECT_COLORS = [
  '#C85A32',
  '#D9822B',
  '#2E7D5B',
  '#B84A62',
  '#5B6B8C',
  '#7A5C43',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

export function CreateProjectDialog({ open, onClose, onCreated }: Props) {
  const { firebaseUser } = useAuthStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'active',
      visibility: 'workspace',
      color: PROJECT_COLORS[0],
    },
  });

  const selectedColor = watch('color');

  const onSubmit = async (data: ProjectInput) => {
    if (!firebaseUser || !activeWorkspaceId) return;
    try {
      const id = await createProject(activeWorkspaceId, firebaseUser.uid, data);
      toast.success('Project created', `${data.name} is ready.`);
      reset();
      onClose();
      onCreated?.(id);
    } catch (err) {
      toast.error('Could not create project', getReadableErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create project"
      description="Group related tasks, deadlines, and team members."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Project name
          </label>
          <Input placeholder="e.g. Q4 Product Launch" {...register('name')} />
          {errors.name && (
            <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Description
          </label>
          <Textarea placeholder="Goals, scope, or key milestones..." {...register('description')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Visibility
            </label>
            <select
              {...register('visibility')}
              className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm"
            >
              <option value="workspace">Workspace</option>
              <option value="private">Private (invited only)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Deadline
            </label>
            <Input type="date" {...register('deadline')} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Color badge
          </label>
          <div className="flex items-center gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className="h-7 w-7 rounded-full border-2 transition-transform cursor-pointer"
                style={{
                  backgroundColor: c,
                  borderColor: selectedColor === c ? 'var(--text-primary)' : 'transparent',
                  transform: selectedColor === c ? 'scale(1.1)' : 'scale(1)',
                }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create project
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
