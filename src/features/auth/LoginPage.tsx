import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/schemas/auth';
import { loginWithEmail, loginWithGoogle } from '@/services/auth/authService';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

export function LoginPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await loginWithEmail(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error('Sign in failed', getReadableErrorMessage(err));
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error('Google sign in failed', getReadableErrorMessage(err));
    } finally {
      setGoogleLoading(false);
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

        <h1 className="font-display text-xl font-semibold text-[var(--text-primary)]">
          Sign in to your workspace
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Pick up where your team left off.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Work email
            </label>
            <Input
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              <Link
                to="/reset-password"
                className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          <span className="text-xs text-[var(--text-muted)]">or</span>
          <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          isLoading={googleLoading}
          onClick={handleGoogle}
        >
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          New to CollabTask?{' '}
          <Link to="/register" className="font-medium text-[var(--accent-primary)] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
