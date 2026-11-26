import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Filter,
  Kanban,
  LayoutList,
  Plus,
  Settings2,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import {
  addProjectMember,
  deleteProjectById,
  removeProjectMember,
  subscribeProject,
  subscribeProjectMembers,
  updateProject,
  updateProjectMemberRole,
} from '@/services/firestore/projectService';
import { subscribeProjectTasks } from '@/services/firestore/taskService';
import { subscribeWorkspace, subscribeWorkspaceMembers } from '@/services/firestore/workspaceService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { KanbanBoard } from '@/features/tasks/KanbanBoard';
import { CreateTaskDialog } from '@/features/tasks/CreateTaskDialog';
import { TaskDetailDrawer } from '@/features/tasks/TaskDetailDrawer';
import { toast } from '@/components/shared/Toast';
import type {
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  ProjectVisibility,
  TaskItem,
  TaskPriority,
  Workspace,
  WorkspaceMember,
} from '@/types/domain';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const { activeWorkspaceId, getActiveRole } = useWorkspaceStore();
  const searchQuery = useUIStore((s) => s.searchQuery);

  const [project, setProject] = React.useState<Project | null>(null);
  const [workspace, setWorkspace] = React.useState<Workspace | null>(null);
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [projectMembers, setProjectMembers] = React.useState<ProjectMember[]>([]);
  const [selectedNewMemberId, setSelectedNewMemberId] = React.useState('');
  const [selectedNewMemberRole, setSelectedNewMemberRole] = React.useState<ProjectRole>('editor');
  const [view, setView] = React.useState<'board' | 'list' | 'overview'>('board');
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'order' | 'dueDate' | 'priority'>('order');
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createTaskStatus, setCreateTaskStatus] = React.useState('todo');
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);

  const role = getActiveRole();
  const canManage = role === 'owner' || role === 'admin';
  const canAssignTasks = !workspace?.onlyOwnerCanAssign || role === 'owner';

  React.useEffect(() => {
    if (!activeWorkspaceId || !projectId) return;
    const u1 = subscribeProject(activeWorkspaceId, projectId, setProject);
    const u2 = subscribeProjectTasks(activeWorkspaceId, projectId, setTasks);
    const u3 = subscribeWorkspaceMembers(activeWorkspaceId, setMembers);
    const u4 = subscribeWorkspace(activeWorkspaceId, setWorkspace);
    const u5 = subscribeProjectMembers(activeWorkspaceId, projectId, setProjectMembers);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, [activeWorkspaceId, projectId]);

  const filteredTasks = React.useMemo(() => {
    const priorityRank: Record<TaskPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return tasks
      .filter((t) => {
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (assigneeFilter !== 'all' && !t.assigneeIds.includes(assigneeFilter)) return false;
        if (
          searchQuery &&
          !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return priorityRank[a.priority] - priorityRank[b.priority];
        if (sortBy === 'dueDate') {
          const da = a.dueDate?.toMillis() ?? Number.MAX_SAFE_INTEGER;
          const db = b.dueDate?.toMillis() ?? Number.MAX_SAFE_INTEGER;
          return da - db;
        }
        return a.order - b.order;
      });
  }, [tasks, priorityFilter, assigneeFilter, searchQuery, sortBy]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  if (!activeWorkspaceId || !project) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
        Loading project...
      </div>
    );
  }

  const handleOpenCreateTask = (statusId: string) => {
    setCreateTaskStatus(statusId);
    setCreateTaskOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.name}" and all its tasks?`)) return;
    try {
      await deleteProjectById(activeWorkspaceId, project.id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error('Could not delete project', getReadableErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      {/* Project Header (matching Reference Images 1 & 2) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-md"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden -space-x-1.5 sm:flex">
            {members.slice(0, 5).map((m) => (
              <Avatar
                key={m.userId}
                src={m.photoURL}
                name={m.displayName}
                size="sm"
                className="ring-2 ring-[var(--bg-canvas)]"
              />
            ))}
          </div>
          {canAssignTasks && (
            <Button
              variant="dark"
              onClick={() => handleOpenCreateTask(project.statuses[0]?.id ?? 'todo')}
            >
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* View tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView('board')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              view === 'board'
                ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            Board
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              view === 'list'
                ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setView('overview')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
              view === 'overview'
                ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Overview
          </button>
        </div>

        {view !== 'overview' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Filter className="h-3.5 w-3.5" />
              Filter:
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs"
            >
              <option value="all">All assignees</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'order' | 'dueDate' | 'priority')}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs"
            >
              <option value="order">Sort: Manual</option>
              <option value="dueDate">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        )}
      </div>

      {/* Views */}
      {view === 'board' && (
        <KanbanBoard
          workspaceId={activeWorkspaceId}
          projectId={project.id}
          statuses={project.statuses}
          tasks={filteredTasks}
          currentUserId={firebaseUser?.uid}
          isWorkspaceOwner={role === 'owner'}
          canCreateTasks={canAssignTasks}
          onAddTask={handleOpenCreateTask}
          onSelectTask={(t) => setSelectedTaskId(t.id)}
        />
      )}

      {view === 'list' && (
        <Card>
          <CardContent className="divide-y divide-[var(--border-subtle)] p-0">
            {filteredTasks.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
                No tasks match your filters.
              </div>
            ) : (
              filteredTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTaskId(t.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-[var(--bg-surface-muted)]/60 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">
                      {t.status.replace('_', ' ')} • {t.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.dueDate && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        {format(t.dueDate.toDate(), 'MMM d')}
                      </span>
                    )}
                    <div className="flex -space-x-1.5">
                      {t.assigneeSummaries.slice(0, 3).map((a) => (
                        <Avatar key={a.uid} src={a.photoURL} name={a.displayName} size="xs" />
                      ))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {view === 'overview' && (() => {
        const total = tasks.length || project.taskCount;
        const done =
          tasks.length > 0
            ? tasks.filter((t) => t.status === 'completed').length
            : project.completedTaskCount;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Status</span>
                  <Badge variant="primary">{project.status.replace('_', ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Tasks completed</span>
                  <span className="font-semibold">
                    {done} / {total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct === 100 ? 'var(--accent-sage)' : project.color,
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Visibility</span>
                  {canManage ? (
                    <select
                      value={project.visibility}
                      onChange={(e) =>
                        updateProject(activeWorkspaceId, project.id, {
                          visibility: e.target.value as ProjectVisibility,
                        })
                      }
                      className="h-7 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs capitalize"
                    >
                      <option value="workspace">Workspace (all members)</option>
                      <option value="private">Private (invited only)</option>
                    </select>
                  ) : (
                    <span className="capitalize">{project.visibility}</span>
                  )}
                </div>
                {canManage && (
                  <div className="pt-3 flex items-center gap-2">
                    <select
                      value={project.status}
                      onChange={(e) =>
                        updateProject(activeWorkspaceId, project.id, {
                          status: e.target.value as ProjectStatus,
                        })
                      }
                      className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <Button size="sm" variant="destructive" onClick={handleDeleteProject}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Access & Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="text-xs text-[var(--text-secondary)]">
                  {project.visibility === 'private'
                    ? 'Only invited project members and workspace admins/owners can view this private project.'
                    : 'This project is visible to all workspace members. Add members below to assign project-specific roles.'}
                </p>

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedNewMemberId}
                      onChange={(e) => setSelectedNewMemberId(e.target.value)}
                      className="h-8 min-w-[160px] flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs"
                    >
                      <option value="">Select workspace member...</option>
                      {members
                        .filter((m) => !project.memberIds.includes(m.userId))
                        .map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.displayName} ({m.role})
                          </option>
                        ))}
                    </select>
                    <select
                      value={selectedNewMemberRole}
                      onChange={(e) => setSelectedNewMemberRole(e.target.value as ProjectRole)}
                      className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                      <option value="lead">Lead</option>
                    </select>
                    <Button
                      size="sm"
                      disabled={!selectedNewMemberId}
                      onClick={async () => {
                        const target = members.find((m) => m.userId === selectedNewMemberId);
                        if (!target) return;
                        try {
                          await addProjectMember(
                            activeWorkspaceId,
                            project.id,
                            target,
                            selectedNewMemberRole,
                          );
                          setSelectedNewMemberId('');
                          toast.success('Added to project', `${target.displayName} now has access.`);
                        } catch (err) {
                          toast.error('Could not add member', getReadableErrorMessage(err));
                        }
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                )}

                <div className="divide-y divide-[var(--border-subtle)]">
                  {projectMembers.length === 0 ? (
                    <p className="py-2 text-xs text-[var(--text-muted)]">
                      No explicit project members added yet.
                    </p>
                  ) : (
                    projectMembers.map((pm) => (
                      <div
                        key={pm.userId}
                        className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar src={pm.photoURL} name={pm.displayName} size="xs" />
                          <span className="text-xs font-medium">{pm.displayName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {canManage ? (
                            <select
                              value={pm.role}
                              onChange={async (e) => {
                                try {
                                  await updateProjectMemberRole(
                                    activeWorkspaceId,
                                    project.id,
                                    pm.userId,
                                    e.target.value as ProjectRole,
                                  );
                                  toast.success('Project role updated');
                                } catch (err) {
                                  toast.error('Update failed', getReadableErrorMessage(err));
                                }
                              }}
                              className="h-7 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs capitalize"
                            >
                              <option value="lead">Lead</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <Badge variant="neutral" className="capitalize">
                              {pm.role}
                            </Badge>
                          )}
                          {canManage && pm.userId !== project.createdBy && (
                            <button
                              type="button"
                              title="Remove from project"
                              onClick={async () => {
                                try {
                                  await removeProjectMember(activeWorkspaceId, project.id, pm.userId);
                                  toast.success('Removed from project');
                                } catch (err) {
                                  toast.error('Remove failed', getReadableErrorMessage(err));
                                }
                              }}
                              className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--accent-coral)] cursor-pointer"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <CreateTaskDialog
        open={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        workspaceId={activeWorkspaceId}
        projectId={project.id}
        projectName={project.name}
        defaultStatus={createTaskStatus}
        statuses={project.statuses}
        members={members}
        nextOrder={(tasks.length + 1) * 1000}
        canAssignTasks={canAssignTasks}
      />

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        statuses={project.statuses}
        members={members}
        canAssignTasks={canAssignTasks}
      />
    </div>
  );
}
