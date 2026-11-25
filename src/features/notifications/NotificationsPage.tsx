import * as React from 'react';
import { format } from 'date-fns';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  markAllNotificationsRead,
  markNotificationRead,
  registerPushDevice,
  updateNotificationPreferences,
} from '@/services/notifications/notificationService';
import { useAuthStore } from '@/stores/authStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from '@/components/shared/Toast';
import type { AppNotification, NotificationPreferences } from '@/types/domain';

interface Props {
  notifications: AppNotification[];
}

export function NotificationsPage({ notifications }: Props) {
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuthStore();
  const [enablingPush, setEnablingPush] = React.useState(false);

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  const prefs = profile?.notificationPreferences;

  const handleOpen = async (n: AppNotification) => {
    if (!firebaseUser) return;
    if (!n.read) {
      await markNotificationRead(firebaseUser.uid, n.id);
    }
    if (n.projectId) {
      navigate(`/projects/${n.projectId}`);
    } else if (n.type === 'workspace_invite') {
      navigate('/members');
    }
  };

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (!firebaseUser || !prefs) return;
    try {
      await updateNotificationPreferences(firebaseUser.uid, {
        ...prefs,
        [key]: !prefs[key],
      });
    } catch (err) {
      toast.error('Could not save preference', getReadableErrorMessage(err));
    }
  };

  const handleEnablePush = async () => {
    if (!firebaseUser) return;
    setEnablingPush(true);
    try {
      const ok = await registerPushDevice(firebaseUser.uid);
      if (ok) {
        toast.success('Push notifications enabled');
      } else {
        toast.info('Push unavailable', 'Configure VITE_FIREBASE_VAPID_KEY or allow browser notifications.');
      }
    } catch (err) {
      toast.error('Push setup failed', getReadableErrorMessage(err));
    } finally {
      setEnablingPush(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Stay on top of assignments, mentions, and approaching deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" isLoading={enablingPush} onClick={handleEnablePush}>
            <BellRing className="h-3.5 w-3.5" />
            Enable push
          </Button>
          {unreadIds.length > 0 && firebaseUser && (
            <Button
              size="sm"
              variant="soft"
              onClick={() => markAllNotificationsRead(firebaseUser.uid, unreadIds)}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inbox ({notifications.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-[var(--border-subtle)] p-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Bell className="mb-2 h-6 w-6 text-[var(--text-muted)]" />
                <p className="text-sm font-medium">You are all caught up</p>
                <p className="text-xs text-[var(--text-muted)]">
                  New assignments and mentions will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpen(n)}
                  className={`flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--bg-surface-muted)]/60 cursor-pointer ${
                    !n.read ? 'bg-[var(--accent-primary-soft)]/30' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                      )}
                      <p className="text-sm font-semibold">{n.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                    {n.createdAt ? format(n.createdAt.toDate(), 'MMM d, h:mm a') : ''}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {prefs && (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Choose which events notify you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(
                [
                  ['taskAssigned', 'Task assigned to me'],
                  ['mentioned', 'Mentioned in a comment'],
                  ['deadlineApproaching', 'Approaching deadlines'],
                  ['taskCompleted', 'Task completed'],
                  ['push', 'Browser push alerts'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="text-[var(--text-primary)]">{label}</span>
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={() => handleTogglePref(key)}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                </label>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
