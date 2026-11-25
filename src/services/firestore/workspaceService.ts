import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '@/services/firebase/app';
import type {
  UserProfile,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types/domain';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';
}

export async function createWorkspace(
  user: UserProfile,
  input: { name: string; description?: string },
): Promise<string> {
  const wsRef = doc(collection(db, 'workspaces'));
  const workspaceId = wsRef.id;

  await setDoc(wsRef, {
    id: workspaceId,
    name: input.name.trim(),
    slug: slugify(input.name),
    description: input.description?.trim() ?? '',
    logoURL: null,
    ownerId: user.uid,
    memberCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'workspaces', workspaceId, 'members', user.uid), {
    userId: user.uid,
    workspaceId,
    workspaceName: input.name.trim(),
    workspaceLogoURL: null,
    role: 'owner',
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    joinedAt: serverTimestamp(),
  });

  return workspaceId;
}

export async function updateWorkspaceDetails(
  workspaceId: string,
  updates: { name: string; description?: string },
): Promise<void> {
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    name: updates.name.trim(),
    slug: slugify(updates.name),
    description: updates.description?.trim() ?? '',
    updatedAt: serverTimestamp(),
  });
}

export async function updateWorkspaceTaskPolicy(
  workspaceId: string,
  onlyOwnerCanAssign: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    onlyOwnerCanAssign,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadWorkspaceLogo(workspaceId: string, file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Logo image must be 2 MB or smaller.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file.');
  }
  const ext = file.name.split('.').pop() || 'png';
  const logoRef = ref(storage, `workspaces/${workspaceId}/logo/logo_${Date.now()}.${ext}`);
  await uploadBytes(logoRef, file, { contentType: file.type });
  const url = await getDownloadURL(logoRef);
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    logoURL: url,
    updatedAt: serverTimestamp(),
  });
  return url;
}

export function subscribeUserWorkspaces(
  userId: string,
  onData: (memberships: WorkspaceMember[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collectionGroup(db, 'members'),
    where('userId', '==', userId),
    orderBy('joinedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as WorkspaceMember));
    },
    (err) => onError?.(err),
  );
}

export function subscribeWorkspace(
  workspaceId: string,
  onData: (ws: Workspace | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'workspaces', workspaceId), (snap) => {
    onData(snap.exists() ? (snap.data() as Workspace) : null);
  });
}

export function subscribeWorkspaceMembers(
  workspaceId: string,
  onData: (members: WorkspaceMember[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'members'),
    orderBy('joinedAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as WorkspaceMember));
  });
}

export function subscribeWorkspaceInvitations(
  workspaceId: string,
  onData: (invites: WorkspaceInvitation[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'invitations'),
    where('status', '==', 'pending'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as WorkspaceInvitation)
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(list);
    },
    (err) => console.error('Failed to load workspace invitations:', err),
  );
}

export function subscribeUserPendingInvitations(
  email: string,
  onData: (invites: WorkspaceInvitation[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collectionGroup(db, 'invitations'),
    where('email', '==', email.trim().toLowerCase()),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as WorkspaceInvitation));
    },
    (err) => {
      console.error('Failed to load invitations:', err);
      onError?.(err);
    },
  );
}

export async function sendWorkspaceInvite(payload: {
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
}): Promise<{ invitationId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to send an invitation.');

  const normalizedEmail = payload.email.trim().toLowerCase();
  const existingSnap = await getDocs(
    query(
      collection(db, 'workspaces', payload.workspaceId, 'invitations'),
      where('email', '==', normalizedEmail),
      where('status', '==', 'pending'),
    ),
  );
  if (!existingSnap.empty) {
    throw new Error('A pending invitation already exists for this email.');
  }

  const wsSnap = await getDoc(doc(db, 'workspaces', payload.workspaceId));
  const workspaceName = wsSnap.exists() ? (wsSnap.data().name as string) : 'Workspace';
  const invRef = doc(collection(db, 'workspaces', payload.workspaceId, 'invitations'));
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await setDoc(invRef, {
    id: invRef.id,
    workspaceId: payload.workspaceId,
    workspaceName,
    email: normalizedEmail,
    role: payload.role,
    status: 'pending',
    invitedBy: user.uid,
    invitedByName: user.displayName || user.email || 'Teammate',
    createdAt: serverTimestamp(),
    expiresAt,
  });

  return { invitationId: invRef.id };
}

export async function respondWorkspaceInvite(payload: {
  workspaceId: string;
  invitationId: string;
  action: 'accept' | 'reject';
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');

  const invRef = doc(db, 'workspaces', payload.workspaceId, 'invitations', payload.invitationId);
  if (payload.action === 'reject') {
    await updateDoc(invRef, { status: 'rejected' });
    return;
  }

  const invSnap = await getDoc(invRef);
  if (!invSnap.exists()) throw new Error('Invitation not found.');
  const inv = invSnap.data() as WorkspaceInvitation;

  const batch = writeBatch(db);
  batch.set(doc(db, 'workspaces', payload.workspaceId, 'members', user.uid), {
    userId: user.uid,
    workspaceId: payload.workspaceId,
    workspaceName: inv.workspaceName,
    workspaceLogoURL: null,
    role: inv.role,
    invitationId: payload.invitationId,
    displayName: user.displayName || user.email || 'Team Member',
    email: (user.email || inv.email).toLowerCase(),
    photoURL: user.photoURL ?? null,
    joinedAt: serverTimestamp(),
  });
  batch.update(invRef, { status: 'accepted' });
  await batch.commit();

  await updateDoc(doc(db, 'workspaces', payload.workspaceId), {
    memberCount: increment(1),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function revokeWorkspaceInvite(payload: {
  workspaceId: string;
  invitationId: string;
}): Promise<void> {
  await updateDoc(doc(db, 'workspaces', payload.workspaceId, 'invitations', payload.invitationId), {
    status: 'revoked',
  });
}

export async function updateWorkspaceMemberRole(payload: {
  workspaceId: string;
  targetUserId: string;
  role: WorkspaceRole;
}): Promise<void> {
  await updateDoc(doc(db, 'workspaces', payload.workspaceId, 'members', payload.targetUserId), {
    role: payload.role,
  });
}

export async function removeWorkspaceMember(payload: {
  workspaceId: string;
  targetUserId: string;
}): Promise<void> {
  await deleteDoc(doc(db, 'workspaces', payload.workspaceId, 'members', payload.targetUserId));
  await updateDoc(doc(db, 'workspaces', payload.workspaceId), {
    memberCount: increment(-1),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function deleteWorkspaceById(workspaceId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');

  // 1. Delete projects and their tasks/subcollections
  const projectsSnap = await getDocs(collection(db, 'workspaces', workspaceId, 'projects'));
  for (const projDoc of projectsSnap.docs) {
    const tasksSnap = await getDocs(
      collection(db, 'workspaces', workspaceId, 'projects', projDoc.id, 'tasks'),
    );
    for (const taskDoc of tasksSnap.docs) {
      const commentsSnap = await getDocs(
        collection(
          db,
          'workspaces',
          workspaceId,
          'projects',
          projDoc.id,
          'tasks',
          taskDoc.id,
          'comments',
        ),
      );
      if (!commentsSnap.empty) {
        const b = writeBatch(db);
        commentsSnap.docs.forEach((c) => b.delete(c.ref));
        await b.commit();
      }
      await deleteDoc(taskDoc.ref);
    }

    const projMembersSnap = await getDocs(
      collection(db, 'workspaces', workspaceId, 'projects', projDoc.id, 'members'),
    );
    if (!projMembersSnap.empty) {
      const b = writeBatch(db);
      projMembersSnap.docs.forEach((m) => b.delete(m.ref));
      await b.commit();
    }
    await deleteDoc(projDoc.ref);
  }

  // 2. Delete invitations
  const invitesSnap = await getDocs(collection(db, 'workspaces', workspaceId, 'invitations'));
  if (!invitesSnap.empty) {
    const b = writeBatch(db);
    invitesSnap.docs.forEach((inv) => b.delete(inv.ref));
    await b.commit();
  }

  // 3. Delete all non-owner members first, then owner's member doc + workspace doc
  const membersSnap = await getDocs(collection(db, 'workspaces', workspaceId, 'members'));
  const otherMembers = membersSnap.docs.filter((m) => m.id !== user.uid);
  if (otherMembers.length > 0) {
    const b = writeBatch(db);
    otherMembers.forEach((m) => b.delete(m.ref));
    await b.commit();
  }

  const finalBatch = writeBatch(db);
  finalBatch.delete(doc(db, 'workspaces', workspaceId, 'members', user.uid));
  finalBatch.delete(doc(db, 'workspaces', workspaceId));
  await finalBatch.commit();
}
