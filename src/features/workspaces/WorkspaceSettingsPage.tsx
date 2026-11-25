import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Trash2 } from 'lucide-react';
import { workspaceSchema, type WorkspaceInput } from '@/schemas/workspace';
import {
  deleteWorkspaceById,
  subscribeWorkspace,
  updateWorkspaceDetails,
  uploadWorkspaceLogo,
} from '@/services/firestore/workspaceService';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';
import type { Workspace } from '@/types/domain';

export function WorkspaceSettingsPage() {
  const { activeWorkspaceId, getActiveRole } = useWorkspaceStore();
  const [workspace, setWorkspace] = React.useState<Workspace | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const role = getActiveRole();
  const canEdit = role === 'owner' || role === 'admin';
  const isOwner = role === 'owner';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
  });

  React.useEffect(() => {
    if (!activeWorkspaceId) return;
    return subscribeWorkspace(activeWorkspaceId, (ws) => {
      setWorkspace(ws);
      if (ws) {
        reset({ name: ws.name, description: ws.description ?? '' });
      }
    });
  }, [activeWorkspaceId, reset]);

  const onSubmit = async (data: WorkspaceInput) => {
    if (!activeWorkspaceId || !canEdit) return;
    try {
      await updateWorkspaceDetails(activeWorkspaceId, data);
      toast.success('Workspace updated');
    } catch (err) {
      toast.error('Update failed', getReadableErrorMessage(err));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspaceId) return;
    setUploading(true);
    try {
      await uploadWorkspaceLogo(activeWorkspaceId, file);
      toast.success('Workspace logo updated');
    } catch (err) {
      toast.error('Upload failed', getReadableErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspaceId || !workspace) return;
    if (!window.confirm(`Delete "${workspace.name}" and all its projects and tasks permanently?`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteWorkspaceById(activeWorkspaceId);
      toast.success('Workspace deleted');
    } catch (err) {
      toast.error('Delete failed', getReadableErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (!activeWorkspaceId || !workspace) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center text-sm text-[var(--text-secondary)]">
        Select or create a workspace to manage its settings.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure {workspace.name} details and permissions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Workspace name, logo, and overview.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-primary)] text-lg font-bold text-white">
              {workspace.logoURL ? (
                <img
                  src={workspace.logoURL}
                  alt={workspace.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                workspace.name.slice(0, 2).toUpperCase()
              )}
            </div>
            {canEdit && (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Upload logo
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Workspace name
              </label>
              <Input disabled={!canEdit} {...register('name')} />
              {errors.name && (
                <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Description
              </label>
              <Textarea disabled={!canEdit} {...register('description')} />
            </div>

            {canEdit && (
              <Button type="submit" isLoading={isSubmitting}>
                Save changes
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-[var(--accent-coral)]/40">
          <CardHeader>
            <CardTitle className="text-[var(--accent-coral)]">Danger zone</CardTitle>
            <CardDescription>
              Deleting a workspace permanently removes all projects, tasks, and comments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" isLoading={deleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete workspace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
