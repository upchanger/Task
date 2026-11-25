import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();
const db = getFirestore();

async function assertWorkspaceRole(
  workspaceId: string,
  uid: string,
  allowedRoles: string[],
): Promise<{ role: string; displayName: string }> {
  const snap = await db.doc(`workspaces/${workspaceId}/members/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError('permission-denied', 'You are not a member of this workspace.');
  }
  const data = snap.data()!;
  if (!allowedRoles.includes(data.role)) {
    throw new HttpsError('permission-denied', 'Insufficient workspace permissions.');
  }
  return { role: data.role, displayName: data.displayName || 'Teammate' };
}

export const sendInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId, email, role } = request.data as {
    workspaceId: string;
    email: string;
    role: 'admin' | 'member';
  };
  if (!workspaceId || !email || !['admin', 'member'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid invitation payload.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const inviter = await assertWorkspaceRole(workspaceId, request.auth.uid, ['owner', 'admin']);

  const wsSnap = await db.doc(`workspaces/${workspaceId}`).get();
  if (!wsSnap.exists) throw new HttpsError('not-found', 'Workspace not found.');
  const wsName = wsSnap.data()!.name as string;

  const existing = await db
    .collection(`workspaces/${workspaceId}/invitations`)
    .where('email', '==', normalizedEmail)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'A pending invitation already exists for this email.');
  }

  const invRef = db.collection(`workspaces/${workspaceId}/invitations`).doc();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await invRef.set({
    id: invRef.id,
    workspaceId,
    workspaceName: wsName,
    email: normalizedEmail,
    role,
    status: 'pending',
    invitedBy: request.auth.uid,
    invitedByName: inviter.displayName,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });

  // Notify registered user if they already have an account
  const userQuery = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
  if (!userQuery.empty) {
    const targetUid = userQuery.docs[0]!.id;
    await db.collection(`users/${targetUid}/notifications`).add({
      type: 'workspace_invite',
      title: `Invited to ${wsName}`,
      body: `${inviter.displayName} invited you to join ${wsName} as ${role}.`,
      workspaceId,
      projectId: null,
      taskId: null,
      actorId: request.auth.uid,
      actorName: inviter.displayName,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { invitationId: invRef.id };
});

export const respondInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId, invitationId, action } = request.data as {
    workspaceId: string;
    invitationId: string;
    action: 'accept' | 'reject';
  };
  if (!workspaceId || !invitationId || !['accept', 'reject'].includes(action)) {
    throw new HttpsError('invalid-argument', 'Invalid response payload.');
  }

  const userEmail = (request.auth.token.email || '').toLowerCase();
  const invRef = db.doc(`workspaces/${workspaceId}/invitations/${invitationId}`);

  await db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) throw new HttpsError('not-found', 'Invitation not found.');
    const inv = invSnap.data()!;
    if (inv.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Invitation is no longer pending.');
    }
    if (inv.email !== userEmail) {
      throw new HttpsError('permission-denied', 'This invitation belongs to another email.');
    }

    if (action === 'reject') {
      tx.update(invRef, { status: 'rejected' });
      return;
    }

    const userSnap = await tx.get(db.doc(`users/${request.auth!.uid}`));
    const userData = userSnap.data() || {};
    const wsSnap = await tx.get(db.doc(`workspaces/${workspaceId}`));
    const wsData = wsSnap.data() || {};

    tx.set(db.doc(`workspaces/${workspaceId}/members/${request.auth!.uid}`), {
      userId: request.auth!.uid,
      workspaceId,
      workspaceName: wsData.name || inv.workspaceName,
      workspaceLogoURL: wsData.logoURL || null,
      role: inv.role,
      displayName: userData.displayName || request.auth!.token.name || 'Team Member',
      email: userEmail,
      photoURL: userData.photoURL || null,
      joinedAt: FieldValue.serverTimestamp(),
    });
    tx.update(db.doc(`workspaces/${workspaceId}`), {
      memberCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(invRef, { status: 'accepted' });
  });
});

export const revokeInvite = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId, invitationId } = request.data as {
    workspaceId: string;
    invitationId: string;
  };
  await assertWorkspaceRole(workspaceId, request.auth.uid, ['owner', 'admin']);
  await db.doc(`workspaces/${workspaceId}/invitations/${invitationId}`).update({
    status: 'revoked',
  });
});

export const updateMemberRole = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId, targetUserId, role } = request.data as {
    workspaceId: string;
    targetUserId: string;
    role: 'owner' | 'admin' | 'member';
  };
  if (!['owner', 'admin', 'member'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role.');
  }
  await assertWorkspaceRole(workspaceId, request.auth.uid, ['owner']);

  const owners = await db
    .collection(`workspaces/${workspaceId}/members`)
    .where('role', '==', 'owner')
    .get();
  if (owners.size <= 1 && owners.docs[0]?.id === targetUserId && role !== 'owner') {
    throw new HttpsError('failed-precondition', 'Cannot demote the sole remaining owner.');
  }

  await db.doc(`workspaces/${workspaceId}/members/${targetUserId}`).update({ role });
});

export const removeMember = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId, targetUserId } = request.data as {
    workspaceId: string;
    targetUserId: string;
  };
  const caller = await assertWorkspaceRole(workspaceId, request.auth.uid, ['owner', 'admin']);
  const targetRef = db.doc(`workspaces/${workspaceId}/members/${targetUserId}`);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) throw new HttpsError('not-found', 'Member not found.');
  const targetRole = targetSnap.data()!.role;

  if (targetRole === 'owner') {
    throw new HttpsError('permission-denied', 'Cannot remove workspace owner.');
  }
  if (caller.role === 'admin' && targetRole === 'admin') {
    throw new HttpsError('permission-denied', 'Only owners can remove admins.');
  }

  await targetRef.delete();
  await db.doc(`workspaces/${workspaceId}`).update({
    memberCount: FieldValue.increment(-1),
    updatedAt: FieldValue.serverTimestamp(),
  });
});

export const deleteWorkspace = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId } = request.data as { workspaceId: string };
  await assertWorkspaceRole(workspaceId, request.auth.uid, ['owner']);
  await db.recursiveDelete(db.doc(`workspaces/${workspaceId}`));
});

export const deleteProject = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const { workspaceId, projectId } = request.data as { workspaceId: string; projectId: string };
  await assertWorkspaceRole(workspaceId, request.auth.uid, ['owner', 'admin']);
  await db.recursiveDelete(db.doc(`workspaces/${workspaceId}/projects/${projectId}`));
});

export const onTaskWrite = onDocumentWritten(
  'workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}',
  async (event) => {
    const { workspaceId, projectId, taskId } = event.params;
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const projectRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}`);
    const activityCol = db.collection(
      `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/activity`,
    );

    // Maintain project task counters
    let taskDelta = 0;
    let completedDelta = 0;
    if (!before && after) {
      taskDelta = 1;
      if (after.status === 'completed') completedDelta = 1;
    } else if (before && !after) {
      taskDelta = -1;
      if (before.status === 'completed') completedDelta = -1;
    } else if (before && after) {
      const wasDone = before.status === 'completed';
      const isDone = after.status === 'completed';
      if (!wasDone && isDone) completedDelta = 1;
      if (wasDone && !isDone) completedDelta = -1;
    }

    if (taskDelta !== 0 || completedDelta !== 0) {
      await projectRef
        .update({
          taskCount: FieldValue.increment(taskDelta),
          completedTaskCount: FieldValue.increment(completedDelta),
          updatedAt: FieldValue.serverTimestamp(),
        })
        .catch(() => {});
    }

    if (!after) return;

    const actorId = (after.createdBy as string) || 'system';
    const actorSnap = await db.doc(`users/${actorId}`).get().catch(() => null);
    const actorName = (actorSnap?.data()?.displayName as string) || 'Teammate';

    if (!before) {
      await activityCol.add({
        type: 'task_created',
        actorId,
        actorName,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      if (before.status !== after.status) {
        await activityCol.add({
          type: 'status_changed',
          actorId,
          actorName,
          metadata: { from: before.status, to: after.status },
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      if (before.priority !== after.priority) {
        await activityCol.add({
          type: 'priority_changed',
          actorId,
          actorName,
          metadata: { from: before.priority, to: after.priority },
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Assignment notifications for newly added assignees
    const prevAssignees = new Set<string>(before?.assigneeIds || []);
    const nextAssignees: string[] = after.assigneeIds || [];
    for (const uid of nextAssignees) {
      if (!prevAssignees.has(uid)) {
        await db.collection(`users/${uid}/notifications`).add({
          type: 'task_assigned',
          title: `Assigned: ${after.title}`,
          body: `You were assigned to "${after.title}" in ${after.projectName}.`,
          workspaceId,
          projectId,
          taskId,
          actorId,
          actorName,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  },
);

export const onCommentCreate = onDocumentCreated(
  'workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}',
  async (event) => {
    const comment = event.data?.data();
    if (!comment) return;
    const { workspaceId, projectId, taskId } = event.params;

    const taskRef = db.doc(`workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
    const taskSnap = await taskRef.get();
    const taskData = taskSnap.data();

    await taskRef.update({ commentCount: FieldValue.increment(1) }).catch(() => {});
    await db
      .collection(`workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/activity`)
      .add({
        type: 'comment_added',
        actorId: comment.userId,
        actorName: comment.userName,
        createdAt: FieldValue.serverTimestamp(),
      });

    const mentions: string[] = comment.mentions || [];
    for (const uid of mentions) {
      if (uid === comment.userId) continue;
      await db.collection(`users/${uid}/notifications`).add({
        type: 'comment_mention',
        title: `${comment.userName} mentioned you`,
        body: `On "${taskData?.title || 'a task'}": ${String(comment.message).slice(0, 100)}`,
        workspaceId,
        projectId,
        taskId,
        actorId: comment.userId,
        actorName: comment.userName,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  },
);

export const dispatchPushNotification = onDocumentCreated(
  'users/{userId}/notifications/{notificationId}',
  async (event) => {
    const notif = event.data?.data();
    if (!notif) return;
    const { userId } = event.params;

    const userSnap = await db.doc(`users/${userId}`).get();
    const prefs = userSnap.data()?.notificationPreferences;
    if (prefs && prefs.push === false) return;

    const devicesSnap = await db.collection(`users/${userId}/devices`).get();
    if (devicesSnap.empty) return;

    const tokens = devicesSnap.docs.map((d) => d.data().token as string).filter(Boolean);
    if (tokens.length === 0) return;

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: notif.title,
        body: notif.body,
      },
      data: {
        workspaceId: notif.workspaceId || '',
        projectId: notif.projectId || '',
        taskId: notif.taskId || '',
      },
    });

    res.responses.forEach((r, idx) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        devicesSnap.docs[idx]?.ref.delete().catch(() => {});
      }
    });
  },
);

export const deadlineReminders = onSchedule('every 1 hours', async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const snap = await db
    .collectionGroup('tasks')
    .where('reminderSent', '==', false)
    .where('dueDate', '>=', Timestamp.fromDate(now))
    .where('dueDate', '<=', Timestamp.fromDate(in24h))
    .limit(100)
    .get();

  for (const docSnap of snap.docs) {
    const task = docSnap.data();
    if (task.status === 'completed') continue;

    const assignees: string[] = task.assigneeIds || [];
    for (const uid of assignees) {
      await db.collection(`users/${uid}/notifications`).add({
        type: 'deadline_approaching',
        title: `Due soon: ${task.title}`,
        body: `"${task.title}" in ${task.projectName} is due within 24 hours.`,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        actorId: 'system',
        actorName: 'CollabTask',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await docSnap.ref.update({ reminderSent: true });
  }
});
