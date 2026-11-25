import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6">
          <div className="max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{this.state.message}</p>
            <Button
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              Reload application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
