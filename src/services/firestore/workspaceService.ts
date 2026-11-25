import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, functions, storage } from '@/services/firebase/app';
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
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as WorkspaceInvitation));
  });
}

export function subscribeUserPendingInvitations(
  email: string,
  onData: (invites: WorkspaceInvitation[]) => void,
): Unsubscribe {
  const q = query(
    collectionGroup(db, 'invitations'),
    where('email', '==', email.toLowerCase()),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as WorkspaceInvitation));
  });
}

export async function sendWorkspaceInvite(payload: {
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
}): Promise<{ invitationId: string }> {
  const fn = httpsCallable<typeof payload, { invitationId: string }>(functions, 'sendInvite');
  const res = await fn(payload);
  return res.data;
}

export async function respondWorkspaceInvite(payload: {
  workspaceId: string;
  invitationId: string;
  action: 'accept' | 'reject';
}): Promise<void> {
  const fn = httpsCallable<typeof payload, void>(functions, 'respondInvite');
  await fn(payload);
}

export async function revokeWorkspaceInvite(payload: {
  workspaceId: string;
  invitationId: string;
}): Promise<void> {
  const fn = httpsCallable<typeof payload, void>(functions, 'revokeInvite');
  await fn(payload);
}

export async function updateWorkspaceMemberRole(payload: {
  workspaceId: string;
  targetUserId: string;
  role: WorkspaceRole;
}): Promise<void> {
  const fn = httpsCallable<typeof payload, void>(functions, 'updateMemberRole');
  await fn(payload);
}

export async function removeWorkspaceMember(payload: {
  workspaceId: string;
  targetUserId: string;
}): Promise<void> {
  const fn = httpsCallable<typeof payload, void>(functions, 'removeMember');
  await fn(payload);
}

export async function deleteWorkspaceById(workspaceId: string): Promise<void> {
  const fn = httpsCallable<{ workspaceId: string }, void>(functions, 'deleteWorkspace');
  await fn({ workspaceId });
}
