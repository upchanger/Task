import * as React from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { subscribeMyWorkspaceTasks } from '@/services/firestore/taskService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import type { TaskItem } from '@/types/domain';

export function MyTasksPage() {
  const { firebaseUser } = useAuthStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const searchQuery = useUIStore((s) => s.searchQuery);
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);

  React.useEffect(() => {
    if (!activeWorkspaceId || !firebaseUser) return undefined;
    return subscribeMyWorkspaceTasks(activeWorkspaceId, firebaseUser.uid, setTasks);
  }, [activeWorkspaceId, firebaseUser]);

  const visibleTasks = activeWorkspaceId && firebaseUser ? tasks : [];
  const filtered = visibleTasks.filter(
    (t) =>
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          All tasks assigned to you in the active workspace.
        </p>
      </div>

      <Card>
        <CardContent className="divide-y divide-[var(--border-subtle)] p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="mb-2 h-7 w-7 text-[var(--accent-sage)]" />
              <p className="text-sm font-medium">No assigned tasks</p>
              <p className="text-xs text-[var(--text-muted)]">
                Tasks assigned to you across workspace projects will appear here.
              </p>
            </div>
          ) : (
            filtered.map((task) => {
              const due = task.dueDate ? task.dueDate.toDate() : null;
              const overdue = due && task.status !== 'completed' && isPast(due) && !isToday(due);
              return (
                <Link
                  key={task.id}
                  to={`/projects/${task.projectId}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--bg-surface-muted)]/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{task.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {task.projectName} • <span className="capitalize">{task.status.replace('_', ' ')}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge
                      variant={
                        task.priority === 'urgent'
                          ? 'coral'
                          : task.priority === 'high'
                            ? 'primary'
                            : task.priority === 'medium'
                              ? 'amber'
                              : 'neutral'
                      }
                    >
                      {task.priority}
                    </Badge>
                    {due && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          overdue ? 'font-semibold text-[var(--accent-coral)]' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {format(due, 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
