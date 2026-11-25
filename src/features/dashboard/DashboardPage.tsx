import * as React from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, isToday } from 'date-fns';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderKanban,
  ListTodo,
  Plus,
  Sparkles,
} from 'lucide-react';
import { subscribeWorkspaceTasks } from '@/services/firestore/taskService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CreateWorkspaceDialog } from '@/features/workspaces/CreateWorkspaceDialog';
import type { Project, TaskItem } from '@/types/domain';

interface Props {
  projects: Project[];
}

export function DashboardPage({ projects }: Props) {
  const { firebaseUser, profile } = useAuthStore();
  const { activeWorkspaceId, memberships, loading } = useWorkspaceStore();
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [createWsOpen, setCreateWsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!activeWorkspaceId) return undefined;
    return subscribeWorkspaceTasks(activeWorkspaceId, setTasks);
  }, [activeWorkspaceId]);

  const visibleTasks = activeWorkspaceId ? tasks : [];

  if (!loading && memberships.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">
          Welcome to CollabTask, {profile?.displayName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Create your first workspace to invite teammates, launch projects, and collaborate in real
          time.
        </p>
        <Button className="mt-6" size="lg" onClick={() => setCreateWsOpen(true)}>
          <Plus className="h-4 w-4" />
          Create your first workspace
        </Button>
        <CreateWorkspaceDialog open={createWsOpen} onClose={() => setCreateWsOpen(false)} />
      </div>
    );
  }

  const totalTasks = visibleTasks.length;
  const completedTasks = visibleTasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = visibleTasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.dueDate &&
      isPast(t.dueDate.toDate()) &&
      !isToday(t.dueDate.toDate()),
  ).length;
  const myTasksCount = visibleTasks.filter(
    (t) => firebaseUser && t.assigneeIds.includes(firebaseUser.uid) && t.status !== 'completed',
  ).length;

  const statusData = [
    { name: 'To Do', count: visibleTasks.filter((t) => t.status === 'todo').length, color: '#93877D' },
    {
      name: 'In Progress',
      count: visibleTasks.filter((t) => t.status === 'in_progress').length,
      color: '#D9822B',
    },
    {
      name: 'In Review',
      count: visibleTasks.filter((t) => t.status === 'in_review').length,
      color: '#C85A32',
    },
    {
      name: 'Completed',
      count: completedTasks,
      color: '#2E7D5B',
    },
  ];

  const priorityData = [
    { name: 'Low', count: visibleTasks.filter((t) => t.priority === 'low').length, color: '#93877D' },
    { name: 'Medium', count: visibleTasks.filter((t) => t.priority === 'medium').length, color: '#D9822B' },
    { name: 'High', count: visibleTasks.filter((t) => t.priority === 'high').length, color: '#C85A32' },
    { name: 'Urgent', count: visibleTasks.filter((t) => t.priority === 'urgent').length, color: '#C93B3B' },
  ];

  const upcomingDeadlines = visibleTasks
    .filter((t) => t.status !== 'completed' && t.dueDate)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Real-time overview of workspace progress, deadlines, and workload.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Total Projects</span>
              <FolderKanban className="h-4 w-4 text-[var(--accent-primary)]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Total Tasks</span>
              <ListTodo className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{totalTasks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-[var(--accent-sage)]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--accent-sage)]">
              {completedTasks}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Pending / Mine</span>
              <Clock className="h-4 w-4 text-[var(--accent-amber)]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">
              {pendingTasks}{' '}
              <span className="text-sm font-normal text-[var(--text-muted)]">
                ({myTasksCount} mine)
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Overdue</span>
              <AlertCircle className="h-4 w-4 text-[var(--accent-coral)]" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--accent-coral)]">
              {overdueTasks}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={3}
                >
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Projects & Upcoming Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No projects created yet.</p>
            ) : (
              projects.slice(0, 5).map((p) => {
                const pct =
                  p.taskCount > 0 ? Math.round((p.completedTaskCount / p.taskCount) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-[var(--border-subtle)]">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No upcoming deadlines.</p>
            ) : (
              upcomingDeadlines.map((t) => (
                <Link
                  key={t.id}
                  to={`/projects/${t.projectId}`}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{t.projectName}</p>
                  </div>
                  <Badge variant="amber">
                    {t.dueDate ? format(t.dueDate.toDate(), 'MMM d') : ''}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
