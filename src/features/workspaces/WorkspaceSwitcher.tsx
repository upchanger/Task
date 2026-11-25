import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { cn } from '@/utils/cn';

interface Props {
  collapsed?: boolean;
  onCreateClick: () => void;
}

export function WorkspaceSwitcher({ collapsed, onCreateClick }: Props) {
  const { memberships, activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const active = memberships.find((m) => m.workspaceId === activeWorkspaceId) ?? memberships[0];

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (active?.workspaceName ?? 'W').slice(0, 2).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-2 text-left transition-colors hover:border-[var(--border-strong)] cursor-pointer',
          collapsed && 'justify-center px-1.5',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-xs font-bold text-white">
          {active?.workspaceLogoURL ? (
            <img
              src={active.workspaceLogoURL}
              alt={active.workspaceName}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-[var(--text-primary)]">
                {active?.workspaceName ?? 'No workspace'}
              </p>
              <p className="truncate text-[11px] capitalize text-[var(--text-muted)]">
                {active?.role ?? 'Select'}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-lg">
          <div className="px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
            Workspaces
          </div>
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {memberships.map((m) => (
              <button
                key={m.workspaceId}
                type="button"
                onClick={() => {
                  setActiveWorkspaceId(m.workspaceId);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer',
                  m.workspaceId === active?.workspaceId
                    ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] font-medium'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]',
                )}
              >
                <span className="truncate">{m.workspaceName}</span>
                {m.workspaceId === active?.workspaceId && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateClick();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary-soft)] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
