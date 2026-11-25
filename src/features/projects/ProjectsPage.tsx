import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Archive, Calendar, FolderKanban, Plus } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { updateProject } from '@/services/firestore/projectService';
import { subscribeWorkspaceTasks } from '@/services/firestore/taskService';
import { getReadableErrorMessage } from '@/utils/errors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CreateProjectDialog } from './CreateProjectDialog';
import { toast } from '@/components/shared/Toast';
import type { Project, TaskItem } from '@/types/domain';

interface Props {
  projects: Project[];
}

export function ProjectsPage({ projects }: Props) {
  const navigate = useNavigate();
  const { activeWorkspaceId, getActiveRole } = useWorkspaceStore();
  const searchQuery = useUIStore((s) => s.searchQuery);
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);

  React.useEffect(() => {
    if (!activeWorkspaceId) return undefined;
    return subscribeWorkspaceTasks(activeWorkspaceId, setTasks);
  }, [activeWorkspaceId]);

  const visibleTasks = activeWorkspaceId ? tasks : [];

  const role = getActiveRole();
  const canManage = role === 'owner' || role === 'admin';

  const filtered = projects.filter((p) => {
    const matchesArchive = showArchived ? p.status === 'archived' : p.status !== 'archived';
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArchive && matchesSearch;
  });

  const handleToggleArchive = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    try {
      const nextStatus = project.status === 'archived' ? 'active' : 'archived';
      await updateProject(activeWorkspaceId, project.id, { status: nextStatus });
      toast.success(nextStatus === 'archived' ? 'Project archived' : 'Project restored');
    } catch (err) {
      toast.error('Action failed', getReadableErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Track progress and collaborate across workspace initiatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived((s) => !s)}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Show active' : 'Archived'}
          </Button>
          {canManage && activeWorkspaceId && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="font-display text-base font-semibold">
              {showArchived ? 'No archived projects' : 'No projects yet'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
              {canManage
                ? 'Create your first project to start organizing tasks on a Kanban board.'
                : 'Projects created by workspace admins will appear here.'}
            </p>
            {canManage && !showArchived && activeWorkspaceId && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const pTasks = visibleTasks.filter((t) => t.projectId === project.id);
            const total = pTasks.length || project.taskCount;
            const done =
              pTasks.length > 0
                ? pTasks.filter((t) => t.status === 'completed').length
                : project.completedTaskCount;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <Card className="h-full transition-colors hover:border-[var(--border-strong)]">
                  <CardContent className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <h3 className="font-display text-base font-semibold line-clamp-1">
                            {project.name}
                          </h3>
                        </div>
                        <Badge variant={project.status === 'completed' ? 'sage' : 'neutral'}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Progress</span>
                          <span className="font-medium">
                            {done}/{total} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct === 100 ? 'var(--accent-sage)' : project.color,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {project.deadline
                            ? format(project.deadline.toDate(), 'MMM d, yyyy')
                            : 'No deadline'}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleArchive(e, project)}
                            className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            {project.status === 'archived' ? 'Restore' : 'Archive'}
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/projects/${id}`)}
      />
    </div>
  );
}
