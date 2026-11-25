import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'error' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'info' }),
};

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            'flex items-start gap-3 rounded-xl border bg-[var(--bg-surface)] p-3.5 shadow-lg',
            item.variant === 'error'
              ? 'border-[var(--accent-coral)]/40'
              : item.variant === 'success'
                ? 'border-[var(--accent-sage)]/40'
                : 'border-[var(--border-subtle)]',
          )}
        >
          {item.variant === 'success' && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-sage)]" />
          )}
          {item.variant === 'error' && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-coral)]" />
          )}
          {item.variant === 'info' && (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Dismiss"
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
