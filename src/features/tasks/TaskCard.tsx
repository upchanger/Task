import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, isToday } from 'date-fns';
import { Calendar, MessageSquare, Paperclip } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { TaskItem, TaskPriority } from '@/types/domain';

interface Props {
  task: TaskItem;
  onClick: () => void;
}

const PRIORITY_BADGE: Record<
  TaskPriority,
  { label: string; variant: 'neutral' | 'amber' | 'primary' | 'coral' }
> = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'amber' },
  high: { label: 'High', variant: 'primary' },
  urgent: { label: 'Urgent', variant: 'coral' },
};

export function TaskCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalSubs = task.subtasks.length;
  const doneSubs = task.subtasks.filter((s) => s.completed).length;
  const progress =
    totalSubs > 0
      ? Math.round((doneSubs / totalSubs) * 100)
      : task.status === 'completed'
        ? 100
        : task.status === 'in_review'
          ? 80
          : task.status === 'in_progress'
            ? 40
            : 0;

  const dueDate = task.dueDate ? task.dueDate.toDate() : null;
  const isOverdue = dueDate && task.status !== 'completed' && isPast(dueDate) && !isToday(dueDate);
  const priorityInfo = PRIORITY_BADGE[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 transition-colors hover:border-[var(--border-strong)]',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-[var(--accent-primary)]/40',
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
        {task.labels.slice(0, 2).map((lbl) => (
          <span
            key={lbl.id}
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${lbl.color}18`, color: lbl.color }}
          >
            {lbl.name}
          </span>
        ))}
      </div>

      <h4 className="font-display text-sm font-semibold leading-snug text-[var(--text-primary)]">
        {task.title}
      </h4>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
          {task.description}
        </p>
      )}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <span>Progress</span>
          <span className="font-medium text-[var(--text-primary)]">{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-surface-muted)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor:
                progress === 100
                  ? 'var(--accent-sage)'
                  : task.priority === 'urgent'
                    ? 'var(--accent-coral)'
                    : 'var(--accent-amber)',
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pt-1">
        <div className="flex -space-x-1.5">
          {task.assigneeSummaries.slice(0, 3).map((a) => (
            <Avatar
              key={a.uid}
              src={a.photoURL}
              name={a.displayName}
              size="xs"
              className="ring-2 ring-[var(--bg-surface)]"
            />
          ))}
          {task.assigneeSummaries.length > 3 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-surface-muted)] text-[10px] font-medium text-[var(--text-secondary)] ring-2 ring-[var(--bg-surface)]">
              +{task.assigneeSummaries.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-muted)]">
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}
          {task.attachments.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" />
              {task.attachments.length}
            </span>
          )}
          {dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                isOverdue && 'font-medium text-[var(--accent-coral)]',
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(dueDate, 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
