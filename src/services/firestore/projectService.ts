import {
  collection,
  deleteDoc,
  doc,
  getDocs,
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
import { db } from '@/services/firebase/app';
import type {
  Project,
  ProjectStatus,
  ProjectStatusConfig,
  ProjectVisibility,
  WorkspaceRole,
} from '@/types/domain';

export const DEFAULT_PROJECT_STATUSES: ProjectStatusConfig[] = [
  { id: 'todo', label: 'To Do', color: '#93877D', order: 0, category: 'todo' },
  { id: 'in_progress', label: 'In Progress', color: '#D9822B', order: 1, category: 'in_progress' },
  { id: 'in_review', label: 'In Review', color: '#C85A32', order: 2, category: 'review' },
  { id: 'completed', label: 'Completed', color: '#2E7D5B', order: 3, category: 'done' },
];

export function subscribeWorkspaceProjects(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole | null,
  onData: (projects: Project[]) => void,
): Unsubscribe {
  const projectsCol = collection(db, 'workspaces', workspaceId, 'projects');

  if (role === 'owner' || role === 'admin') {
    const q = query(projectsCol, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => onData(snap.docs.map((d) => d.data() as Project)),
      (err) => console.error('Failed to load workspace projects:', err),
    );
  }

  // For 'member' role, query workspace-visible and member-specific private projects separately
  // so Firestore list security rules can validate each query statically.
  let publicProjects: Project[] = [];
  let privateProjects: Project[] = [];

  const emitMerged = () => {
    const byId = new Map<string, Project>();
    [...publicProjects, ...privateProjects].forEach((p) => byId.set(p.id, p));
    const merged = Array.from(byId.values()).sort(
      (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
    );
    onData(merged);
  };

  const unsubPublic = onSnapshot(
    query(projectsCol, where('visibility', '==', 'workspace')),
    (snap) => {
      publicProjects = snap.docs.map((d) => d.data() as Project);
      emitMerged();
    },
    (err) => console.error('Failed to load workspace projects:', err),
  );

  const unsubPrivate = onSnapshot(
    query(projectsCol, where('memberIds', 'array-contains', userId)),
    (snap) => {
      privateProjects = snap.docs.map((d) => d.data() as Project);
      emitMerged();
    },
    (err) => console.error('Failed to load private projects:', err),
  );

  return () => {
    unsubPublic();
    unsubPrivate();
  };
}

export function subscribeProject(
  workspaceId: string,
  projectId: string,
  onData: (project: Project | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'workspaces', workspaceId, 'projects', projectId), (snap) => {
    onData(snap.exists() ? (snap.data() as Project) : null);
  });
}

export async function createProject(
  workspaceId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    status: ProjectStatus;
    visibility: ProjectVisibility;
    color: string;
    startDate?: string;
    deadline?: string;
  },
): Promise<string> {
  const ref = doc(collection(db, 'workspaces', workspaceId, 'projects'));
  await setDoc(ref, {
    id: ref.id,
    workspaceId,
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    status: input.status,
    visibility: input.visibility,
    color: input.color,
    startDate: input.startDate ? Timestamp.fromDate(new Date(input.startDate)) : null,
    deadline: input.deadline ? Timestamp.fromDate(new Date(input.deadline)) : null,
    createdBy: userId,
    memberIds: [userId],
    statuses: DEFAULT_PROJECT_STATUSES,
    taskCount: 0,
    completedTaskCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  input: Partial<{
    name: string;
    description: string;
    status: ProjectStatus;
    visibility: ProjectVisibility;
    color: string;
    startDate: string | null;
    deadline: string | null;
  }>,
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.visibility !== undefined) payload.visibility = input.visibility;
  if (input.color !== undefined) payload.color = input.color;
  if (input.startDate !== undefined) {
    payload.startDate = input.startDate ? Timestamp.fromDate(new Date(input.startDate)) : null;
  }
  if (input.deadline !== undefined) {
    payload.deadline = input.deadline ? Timestamp.fromDate(new Date(input.deadline)) : null;
  }

  await updateDoc(doc(db, 'workspaces', workspaceId, 'projects', projectId), payload);
}

export async function deleteProjectById(workspaceId: string, projectId: string): Promise<void> {
  const tasksSnap = await getDocs(
    collection(db, 'workspaces', workspaceId, 'projects', projectId, 'tasks'),
  );
  for (const taskDoc of tasksSnap.docs) {
    const commentsSnap = await getDocs(
      collection(
        db,
        'workspaces',
        workspaceId,
        'projects',
        projectId,
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
    collection(db, 'workspaces', workspaceId, 'projects', projectId, 'members'),
  );
  if (!projMembersSnap.empty) {
    const b = writeBatch(db);
    projMembersSnap.docs.forEach((m) => b.delete(m.ref));
    await b.commit();
  }

  await deleteDoc(doc(db, 'workspaces', workspaceId, 'projects', projectId));
}
