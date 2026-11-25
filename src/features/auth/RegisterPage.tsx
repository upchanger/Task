import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@/schemas/auth';
import { loginWithGoogle, registerWithEmail } from '@/services/auth/authService';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerWithEmail(data.displayName, data.email, data.password);
      toast.success('Account created', 'Check your inbox for a verification link.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error('Registration failed', getReadableErrorMessage(err));
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
      <div className="w-full max-w-[420px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">CollabTask</span>
        </div>

        <h1 className="font-display text-xl font-semibold text-[var(--text-primary)]">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Set up your profile and start organizing projects.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Full name
            </label>
            <Input placeholder="Alex Rivera" autoComplete="name" {...register('displayName')} />
            {errors.displayName && (
              <p className="mt-1 text-xs text-[var(--accent-coral)]">
                {errors.displayName.message}
              </p>
            )}
          </div>

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
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Password
            </label>
            <Input
              type="password"
              placeholder="At least 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Confirm password
            </label>
            <Input
              type="password"
              placeholder="Repeat password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-[var(--accent-coral)]">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create account
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
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--accent-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
