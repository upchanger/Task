import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { updateTaskFields } from '@/services/firestore/taskService';
import { computeOrderBetween } from '@/utils/order';
import { getReadableErrorMessage } from '@/utils/errors';
import { toast } from '@/components/shared/Toast';
import { TaskCard } from './TaskCard';
import type { ProjectStatusConfig, TaskItem } from '@/types/domain';

interface Props {
  workspaceId: string;
  projectId: string;
  statuses: ProjectStatusConfig[];
  tasks: TaskItem[];
  canCreateTasks?: boolean;
  onAddTask: (statusId: string) => void;
  onSelectTask: (task: TaskItem) => void;
}

function KanbanColumn({
  status,
  tasks,
  canCreateTasks = true,
  onAddTask,
  onSelectTask,
}: {
  status: ProjectStatusConfig;
  tasks: TaskItem[];
  canCreateTasks?: boolean;
  onAddTask: () => void;
  onSelectTask: (task: TaskItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div
      ref={setNodeRef}
      className="flex min-w-[285px] flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 p-3"
      style={{
        outline: isOver ? '2px dashed var(--accent-primary)' : undefined,
      }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            {status.label}
          </h3>
          <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {tasks.length}
          </span>
        </div>
        {canCreateTasks && (
          <button
            type="button"
            onClick={onAddTask}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer"
            title={`Add task to ${status.label}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {canCreateTasks && (
        <button
          type="button"
          onClick={onAddTask}
          className="mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/70 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add new task
        </button>
      )}

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2.5 min-h-[120px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  workspaceId,
  projectId,
  statuses,
  tasks,
  canCreateTasks = true,
  onAddTask,
  onSelectTask,
}: Props) {
  const [optimisticMove, setOptimisticMove] = React.useState<{
    id: string;
    status: string;
    order: number;
  } | null>(null);
  const [activeTask, setActiveTask] = React.useState<TaskItem | null>(null);

  const optimisticTasks = React.useMemo(() => {
    if (!optimisticMove) return tasks;
    return tasks.map((t) =>
      t.id === optimisticMove.id
        ? { ...t, status: optimisticMove.status, order: optimisticMove.order }
        : t,
    );
  }, [tasks, optimisticMove]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const sortedStatuses = React.useMemo(
    () => [...statuses].sort((a, b) => a.order - b.order),
    [statuses],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = optimisticTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const dragged = optimisticTasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overId = String(over.id);
    const overColumn = sortedStatuses.find((s) => s.id === overId);
    const overTask = optimisticTasks.find((t) => t.id === overId);

    const targetStatus = overColumn ? overColumn.id : overTask?.status;
    if (!targetStatus) return;

    const targetColumnTasks = optimisticTasks
      .filter((t) => t.status === targetStatus && t.id !== dragged.id)
      .sort((a, b) => a.order - b.order);

    let newOrder: number;
    if (overTask && overTask.id !== dragged.id) {
      const overIndex = targetColumnTasks.findIndex((t) => t.id === overTask.id);
      const prev = overIndex > 0 ? (targetColumnTasks[overIndex - 1]?.order ?? null) : null;
      const next = targetColumnTasks[overIndex]?.order ?? null;
      newOrder = computeOrderBetween(prev, next);
    } else {
      const last = targetColumnTasks[targetColumnTasks.length - 1]?.order ?? null;
      newOrder = computeOrderBetween(last, null);
    }

    if (dragged.status === targetStatus && dragged.order === newOrder) return;

    const isCompleted = targetStatus === 'completed';
    setOptimisticMove({ id: dragged.id, status: targetStatus, order: newOrder });

    try {
      await updateTaskFields(workspaceId, projectId, dragged.id, {
        status: targetStatus,
        order: newOrder,
        completedAt: isCompleted ? serverTimestamp() : null,
      });
    } catch (err) {
      toast.error('Could not move task', getReadableErrorMessage(err));
    } finally {
      setOptimisticMove(null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStatuses.map((status) => {
          const columnTasks = optimisticTasks
            .filter((t) => t.status === status.id)
            .sort((a, b) => a.order - b.order);
          return (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={columnTasks}
              canCreateTasks={canCreateTasks}
              onAddTask={() => onAddTask(status.id)}
              onSelectTask={onSelectTask}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-[285px] rotate-1 opacity-95">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
