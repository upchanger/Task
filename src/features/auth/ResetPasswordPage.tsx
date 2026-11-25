import * as React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck, Sparkles } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordInput } from '@/schemas/auth';
import { sendPasswordReset } from '@/services/auth/authService';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

export function ResetPasswordPage() {
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      await sendPasswordReset(data.email);
      setSent(true);
    } catch (err) {
      toast.error('Reset failed', getReadableErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">CollabTask</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-sage-soft)] text-[var(--accent-sage)]">
              <MailCheck className="h-5 w-5" />
            </div>
            <h1 className="font-display text-xl font-semibold">Check your email</h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              We sent a password reset link if an account exists for that email.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-primary)] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold">Reset your password</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Enter your email and we will send a recovery link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Send reset link
              </Button>
            </form>

            <div className="mt-5 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
