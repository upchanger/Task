import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        neutral: 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
        primary: 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]',
        amber: 'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]',
        sage: 'bg-[var(--accent-sage-soft)] text-[var(--accent-sage)]',
        coral: 'bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
