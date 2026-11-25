import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workspaceSchema, type WorkspaceInput } from '@/schemas/workspace';
import { createWorkspace } from '@/services/firestore/workspaceService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateWorkspaceDialog({ open, onClose }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
  });

  const onSubmit = async (data: WorkspaceInput) => {
    if (!profile) return;
    try {
      const wsId = await createWorkspace(profile, data);
      setActiveWorkspaceId(wsId);
      toast.success('Workspace created', `${data.name} is ready.`);
      reset();
      onClose();
    } catch (err) {
      toast.error('Could not create workspace', getReadableErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create workspace"
      description="Organize projects, tasks, and teammates in a dedicated space."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Workspace name
          </label>
          <Input placeholder="e.g. Product Studio" {...register('name')} />
          {errors.name && (
            <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Description (optional)
          </label>
          <Textarea
            placeholder="What does this team work on?"
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-[var(--accent-coral)]">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create workspace
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
