import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, MailCheck, Send } from 'lucide-react';
import { profileSchema, type ProfileInput } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';
import {
  resendVerificationEmail,
  updateUserProfile,
  uploadUserAvatar,
} from '@/services/auth/authService';
import { getReadableErrorMessage } from '@/utils/errors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

export function ProfilePage() {
  const { firebaseUser, profile } = useAuthStore();
  const [uploading, setUploading] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      jobTitle: profile?.jobTitle ?? '',
    },
  });

  React.useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName,
        jobTitle: profile.jobTitle ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileInput) => {
    if (!firebaseUser) return;
    try {
      await updateUserProfile(firebaseUser.uid, {
        displayName: data.displayName,
        jobTitle: data.jobTitle || null,
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile', getReadableErrorMessage(err));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploading(true);
    try {
      await uploadUserAvatar(firebaseUser.uid, file);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error('Upload failed', getReadableErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleResendVerification = async () => {
    if (!firebaseUser) return;
    setResending(true);
    try {
      await resendVerificationEmail(firebaseUser);
      toast.success('Verification email sent');
    } catch (err) {
      toast.error('Could not send email', getReadableErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage your personal details and account verification.
        </p>
      </div>

      {firebaseUser && !firebaseUser.emailVerified && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] p-4">
          <div className="text-sm">
            <p className="font-medium text-[var(--text-primary)]">Verify your email address</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Confirm {firebaseUser.email} to secure your account and receive notifications.
            </p>
          </div>
          <Button size="sm" variant="outline" isLoading={resending} onClick={handleResendVerification}>
            <Send className="h-3.5 w-3.5" />
            Resend link
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Visible to teammates across your workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar
              src={profile?.photoURL}
              name={profile?.displayName ?? 'User'}
              size="lg"
              className="h-16 w-16 text-lg"
            />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
                Change photo
              </Button>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">PNG, JPG or WebP up to 2 MB.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Full name
              </label>
              <Input {...register('displayName')} />
              {errors.displayName && (
                <p className="mt-1 text-xs text-[var(--accent-coral)]">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Job title
              </label>
              <Input placeholder="e.g. Product Designer" {...register('jobTitle')} />
              {errors.jobTitle && (
                <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.jobTitle.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <div className="flex items-center gap-2">
                <Input value={firebaseUser?.email ?? ''} disabled />
                {firebaseUser?.emailVerified && (
                  <Badge variant="sage">
                    <MailCheck className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" isLoading={isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
