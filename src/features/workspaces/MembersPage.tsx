import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailPlus, Shield, Trash2, UserMinus, Check, X } from 'lucide-react';
import { inviteMemberSchema, type InviteMemberInput } from '@/schemas/workspace';
import {
  removeWorkspaceMember,
  respondWorkspaceInvite,
  revokeWorkspaceInvite,
  sendWorkspaceInvite,
  subscribeUserPendingInvitations,
  subscribeWorkspaceInvitations,
  subscribeWorkspaceMembers,
  updateWorkspaceMemberRole,
} from '@/services/firestore/workspaceService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getReadableErrorMessage } from '@/utils/errors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from '@/types/domain';

export function MembersPage() {
  const { firebaseUser } = useAuthStore();
  const { activeWorkspaceId, getActiveRole } = useWorkspaceStore();
  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = React.useState<WorkspaceInvitation[]>([]);
  const [myInvites, setMyInvites] = React.useState<WorkspaceInvitation[]>([]);

  const myRole = getActiveRole();
  const canManage = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'member' },
  });

  React.useEffect(() => {
    if (!activeWorkspaceId) return;
    const unsubMembers = subscribeWorkspaceMembers(activeWorkspaceId, setMembers);
    let unsubInvites = () => {};
    if (canManage) {
      unsubInvites = subscribeWorkspaceInvitations(activeWorkspaceId, setWorkspaceInvites);
    }
    return () => {
      unsubMembers();
      unsubInvites();
    };
  }, [activeWorkspaceId, canManage]);

  React.useEffect(() => {
    if (!firebaseUser?.email) return;
    return subscribeUserPendingInvitations(firebaseUser.email, setMyInvites);
  }, [firebaseUser?.email]);

  const onInvite = async (data: InviteMemberInput) => {
    if (!activeWorkspaceId) return;
    try {
      await sendWorkspaceInvite({
        workspaceId: activeWorkspaceId,
        email: data.email.toLowerCase(),
        role: data.role,
      });
      toast.success('Invitation sent', `Invited ${data.email} as ${data.role}.`);
      reset({ email: '', role: 'member' });
    } catch (err) {
      toast.error('Invitation failed', getReadableErrorMessage(err));
    }
  };

  const handleRoleChange = async (targetUserId: string, role: WorkspaceRole) => {
    if (!activeWorkspaceId) return;
    try {
      await updateWorkspaceMemberRole({ workspaceId: activeWorkspaceId, targetUserId, role });
      toast.success('Role updated');
    } catch (err) {
      toast.error('Could not update role', getReadableErrorMessage(err));
    }
  };

  const handleRemove = async (targetUserId: string, name: string) => {
    if (!activeWorkspaceId) return;
    try {
      await removeWorkspaceMember({ workspaceId: activeWorkspaceId, targetUserId });
      toast.success('Member removed', `${name} was removed from this workspace.`);
    } catch (err) {
      toast.error('Could not remove member', getReadableErrorMessage(err));
    }
  };

  const handleRespondInvite = async (inv: WorkspaceInvitation, action: 'accept' | 'reject') => {
    try {
      await respondWorkspaceInvite({
        workspaceId: inv.workspaceId,
        invitationId: inv.id,
        action,
      });
      toast.success(action === 'accept' ? 'Joined workspace' : 'Invitation declined');
    } catch (err) {
      toast.error('Action failed', getReadableErrorMessage(err));
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await revokeWorkspaceInvite({ workspaceId: activeWorkspaceId, invitationId });
      toast.success('Invitation revoked');
    } catch (err) {
      toast.error('Could not revoke invitation', getReadableErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Team Members</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Invite collaborators and manage workspace roles.
        </p>
      </div>

      {myInvites.length > 0 && (
        <Card className="border-[var(--accent-primary)]/30 bg-[var(--accent-primary-soft)]/40">
          <CardHeader>
            <CardTitle>Your pending invitations</CardTitle>
            <CardDescription>You have been invited to join these workspaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {myInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{inv.workspaceName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Invited by {inv.invitedByName} as <span className="capitalize">{inv.role}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespondInvite(inv, 'reject')}
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => handleRespondInvite(inv, 'accept')}>
                    <Check className="h-3.5 w-3.5" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && activeWorkspaceId && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              Invite by their sign-in email. They will see and accept the invitation on their Team
              Members page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onInvite)} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input placeholder="colleague@company.com" {...register('email')} />
                {errors.email && (
                  <p className="mt-1 text-xs text-[var(--accent-coral)]">{errors.email.message}</p>
                )}
              </div>
              <select
                {...register('role')}
                className="h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" isLoading={isSubmitting}>
                <MailPlus className="h-4 w-4" />
                Send invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--border-subtle)]">
          {members.map((member) => {
            const isSelf = member.userId === firebaseUser?.uid;
            return (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={member.photoURL} name={member.displayName} />
                  <div>
                    <p className="text-sm font-medium">
                      {member.displayName}{' '}
                      {isSelf && (
                        <span className="text-xs text-[var(--text-muted)]">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && !isSelf ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.userId, e.target.value as WorkspaceRole)
                      }
                      className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs capitalize"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  ) : (
                    <Badge variant={member.role === 'owner' ? 'primary' : 'neutral'}>
                      <Shield className="h-3 w-3" />
                      <span className="capitalize">{member.role}</span>
                    </Badge>
                  )}

                  {canManage && !isSelf && member.role !== 'owner' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Remove member"
                      onClick={() => handleRemove(member.userId, member.displayName)}
                    >
                      <UserMinus className="h-4 w-4 text-[var(--accent-coral)]" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {canManage && workspaceInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending workspace invitations ({workspaceInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-[var(--border-subtle)]">
            {workspaceInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs capitalize text-[var(--text-secondary)]">
                    Role: {inv.role} • Invited by {inv.invitedByName}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevoke(inv.id)}
                  className="text-[var(--accent-coral)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
