import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { subscribeWorkspaceTasks } from '@/services/firestore/taskService';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import type { TaskItem } from '@/types/domain';

export function CalendarPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);

  React.useEffect(() => {
    if (!activeWorkspaceId) return undefined;
    return subscribeWorkspaceTasks(activeWorkspaceId, setTasks);
  }, [activeWorkspaceId]);

  const visibleTasks = activeWorkspaceId ? tasks : [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Track upcoming task deadlines across your workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-display text-sm font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-muted)]/60 text-center text-xs font-semibold text-[var(--text-secondary)]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-2.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-subtle)]">
              {days.map((day) => {
                const dayTasks = visibleTasks.filter(
                  (t) => t.dueDate && isSameDay(t.dueDate.toDate(), day),
                );
                const inMonth = isSameMonth(day, monthStart);
                const isTodayCell = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[108px] p-2 ${
                      inMonth ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-surface-muted)]/30'
                    }`}
                  >
                    <div className="mb-1.5 flex justify-end">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isTodayCell
                            ? 'bg-[var(--accent-primary)] text-white'
                            : inMonth
                              ? 'text-[var(--text-primary)]'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((t) => (
                        <Link
                          key={t.id}
                          to={`/projects/${t.projectId}`}
                          className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] hover:opacity-80"
                        >
                          {t.title}
                        </Link>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="block px-1 text-[10px] text-[var(--text-muted)]">
                          +{dayTasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
