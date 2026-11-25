import * as React from 'react';
import { format } from 'date-fns';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import {
  CheckSquare,
  History,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  addTaskComment,
  deleteTask,
  deleteTaskComment,
  subscribeTaskActivity,
  subscribeTaskComments,
  updateTaskFields,
  uploadTaskAttachment,
} from '@/services/firestore/taskService';
import { useAuthStore } from '@/stores/authStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';
import type {
  ProjectStatusConfig,
  Subtask,
  TaskActivity,
  TaskComment,
  TaskItem,
  TaskPriority,
  WorkspaceMember,
} from '@/types/domain';

interface Props {
  task: TaskItem | null;
  onClose: () => void;
  statuses: ProjectStatusConfig[];
  members: WorkspaceMember[];
  canAssignTasks?: boolean;
}

export function TaskDetailDrawer({ task, onClose, statuses, members, canAssignTasks = true }: Props) {
  if (!task) return null;
  return (
    <TaskDetailDrawerBody
      key={task.id}
      task={task}
      onClose={onClose}
      statuses={statuses}
      members={members}
      canAssignTasks={canAssignTasks}
    />
  );
}

function TaskDetailDrawerBody({
  task,
  onClose,
  statuses,
  members,
  canAssignTasks = true,
}: Omit<Props, 'task'> & { task: TaskItem }) {
  const { firebaseUser, profile } = useAuthStore();
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  const [activity, setActivity] = React.useState<TaskActivity[]>([]);
  const [activeTab, setActiveTab] = React.useState<'comments' | 'activity'>('comments');
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? '');
  const [newSubtask, setNewSubtask] = React.useState('');
  const [commentText, setCommentText] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const unsubComments = subscribeTaskComments(
      task.workspaceId,
      task.projectId,
      task.id,
      setComments,
    );
    const unsubActivity = subscribeTaskActivity(
      task.workspaceId,
      task.projectId,
      task.id,
      setActivity,
    );
    return () => {
      unsubComments();
      unsubActivity();
    };
  }, [task.workspaceId, task.projectId, task.id]);

  const patchTask = async (fields: Record<string, unknown>) => {
    try {
      await updateTaskFields(task.workspaceId, task.projectId, task.id, fields);
    } catch (err) {
      toast.error('Update failed', getReadableErrorMessage(err));
    }
  };

  const handleSaveText = async () => {
    if (!title.trim()) return;
    if (title.trim() !== task.title || description.trim() !== (task.description ?? '')) {
      await patchTask({ title: title.trim(), description: description.trim() });
      toast.success('Task saved');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const item: Subtask = { id: crypto.randomUUID(), title: newSubtask.trim(), completed: false };
    await patchTask({ subtasks: [...task.subtasks, item] });
    setNewSubtask('');
  };

  const handleToggleSubtask = async (id: string) => {
    const updated = task.subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    await patchTask({ subtasks: updated });
  };

  const handleRemoveSubtask = async (id: string) => {
    await patchTask({ subtasks: task.subtasks.filter((s) => s.id !== id) });
  };

  const handleToggleAssignee = async (member: WorkspaceMember) => {
    const exists = task.assigneeIds.includes(member.userId);
    const nextSummaries = exists
      ? task.assigneeSummaries.filter((a) => a.uid !== member.userId)
      : [
          ...task.assigneeSummaries,
          { uid: member.userId, displayName: member.displayName, photoURL: member.photoURL },
        ];
    await patchTask({
      assigneeIds: nextSummaries.map((a) => a.uid),
      assigneeSummaries: nextSummaries,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploading(true);
    try {
      await uploadTaskAttachment(
        task.workspaceId,
        task.projectId,
        task.id,
        firebaseUser.uid,
        file,
        task.attachments,
      );
      toast.success('Attachment uploaded');
    } catch (err) {
      toast.error('Upload failed', getReadableErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !firebaseUser) return;
    const mentionedIds = members
      .filter((m) =>
        commentText.toLowerCase().includes(`@${m.displayName.toLowerCase().split(' ')[0]}`),
      )
      .map((m) => m.userId);

    try {
      await addTaskComment({
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        userId: firebaseUser.uid,
        userName: profile?.displayName ?? firebaseUser.email ?? 'Member',
        userPhotoURL: profile?.photoURL ?? null,
        message: commentText,
        mentions: mentionedIds,
      });
      setCommentText('');
    } catch (err) {
      toast.error('Comment failed', getReadableErrorMessage(err));
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await deleteTask(task.workspaceId, task.projectId, task.id);
      toast.success('Task deleted');
      onClose();
    } catch (err) {
      toast.error('Could not delete task', getReadableErrorMessage(err));
    }
  };

  const dueDateValue = task.dueDate ? format(task.dueDate.toDate(), 'yyyy-MM-dd') : '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/35" onClick={onClose} aria-hidden="true" />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{task.projectName}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              title="Delete task"
              onClick={handleDeleteTask}
              className="text-[var(--accent-coral)]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close panel">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Title & Description */}
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveText}
              className="border-transparent px-0 font-display text-lg font-bold focus-visible:border-[var(--border-subtle)] focus-visible:px-2"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveText}
              placeholder="Add a detailed description..."
              className="min-h-[76px]"
            />
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/50 p-3.5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) =>
                  patchTask({
                    status: e.target.value,
                    completedAt: e.target.value === 'completed' ? serverTimestamp() : null,
                  })
                }
                className="h-8 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs font-medium"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => patchTask({ priority: e.target.value as TaskPriority })}
                className="h-8 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-xs font-medium capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">
                Due date
              </label>
              <Input
                type="date"
                value={dueDateValue}
                onChange={(e) =>
                  patchTask({
                    dueDate: e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : null,
                    reminderSent: false,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Assignees */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Assignees</p>
              {!canAssignTasks && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  Owner-only assignment enabled
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const assigned = task.assigneeIds.includes(m.userId);
                return (
                  <button
                    key={m.userId}
                    type="button"
                    disabled={!canAssignTasks}
                    onClick={() => handleToggleAssignee(m)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      canAssignTasks ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                    } ${
                      assigned
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] font-medium'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                    }`}
                  >
                    <Avatar src={m.photoURL} name={m.displayName} size="xs" />
                    {m.displayName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
              Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
            </p>
            <div className="space-y-1.5">
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(sub.id)}
                    className="flex flex-1 items-center gap-2 text-left text-sm cursor-pointer"
                  >
                    {sub.completed ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-[var(--accent-sage)]" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                    )}
                    <span
                      className={sub.completed ? 'line-through text-[var(--text-muted)]' : ''}
                    >
                      {sub.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(sub.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-coral)] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddSubtask} className="mt-2 flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add a subtask..."
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" variant="outline">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </form>
          </div>

          {/* Attachments */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Attachments ({task.attachments.length})
              </p>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                isLoading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach file
              </Button>
            </div>
            {task.attachments.length > 0 && (
              <div className="space-y-1.5">
                {task.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs hover:bg-[var(--bg-surface-muted)]"
                  >
                    <span className="truncate font-medium text-[var(--accent-primary)]">
                      {att.name}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {Math.round(att.size / 1024)} KB
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Comments & Activity Tabs */}
          <div>
            <div className="mb-3 flex gap-4 border-b border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-1.5 border-b-2 pb-2 text-xs font-semibold cursor-pointer ${
                  activeTab === 'comments'
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Comments ({comments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-1.5 border-b-2 pb-2 text-xs font-semibold cursor-pointer ${
                  activeTab === 'activity'
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-transparent text-[var(--text-secondary)]'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                Activity ({activity.length})
              </button>
            </div>

            {activeTab === 'comments' ? (
              <div className="space-y-3">
                <form onSubmit={handleSendComment} className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment... (use @Name to mention)"
                    className="text-sm"
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                <div className="space-y-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar src={c.userPhotoURL} name={c.userName} size="xs" />
                          <span className="text-xs font-semibold">{c.userName}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {c.createdAt ? format(c.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                          </span>
                        </div>
                        {c.userId === firebaseUser?.uid && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteTaskComment(task.workspaceId, task.projectId, task.id, c.id)
                            }
                            className="text-[var(--text-muted)] hover:text-[var(--accent-coral)] cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                        {c.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activity.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No activity recorded yet.</p>
                ) : (
                  activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <span>
                        <strong className="text-[var(--text-primary)]">{item.actorName}</strong>{' '}
                        {item.type.replace('_', ' ')}
                        {item.metadata?.to ? ` → ${item.metadata.to}` : ''}
                      </span>
                      <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                        {item.createdAt ? format(item.createdAt.toDate(), 'MMM d, h:mm a') : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
