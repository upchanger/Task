import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/services/firebase/app';
import type {
  Subtask,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  TaskItem,
  TaskLabel,
  TaskPriority,
  UserSummary,
} from '@/types/domain';

export function subscribeProjectTasks(
  workspaceId: string,
  projectId: string,
  onData: (tasks: TaskItem[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'projects', projectId, 'tasks'),
    orderBy('order', 'asc'),
    limit(150),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as TaskItem));
  });
}

export function subscribeWorkspaceTasks(
  workspaceId: string,
  onData: (tasks: TaskItem[]) => void,
): Unsubscribe {
  const q = query(
    collectionGroup(db, 'tasks'),
    where('workspaceId', '==', workspaceId),
    orderBy('dueDate', 'asc'),
    limit(200),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as TaskItem));
  });
}

export function subscribeMyWorkspaceTasks(
  workspaceId: string,
  userId: string,
  onData: (tasks: TaskItem[]) => void,
): Unsubscribe {
  const q = query(
    collectionGroup(db, 'tasks'),
    where('workspaceId', '==', workspaceId),
    where('assigneeIds', 'array-contains', userId),
    orderBy('dueDate', 'asc'),
    limit(100),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as TaskItem));
  });
}

export async function createTask(input: {
  workspaceId: string;
  projectId: string;
  projectName: string;
  userId: string;
  title: string;
  description?: string;
  status: string;
  priority: TaskPriority;
  order: number;
  assignees: UserSummary[];
  labels?: TaskLabel[];
  subtasks?: Subtask[];
  startDate?: string;
  dueDate?: string;
}): Promise<string> {
  const taskRef = doc(
    collection(db, 'workspaces', input.workspaceId, 'projects', input.projectId, 'tasks'),
  );
  await setDoc(taskRef, {
    id: taskRef.id,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectName: input.projectName,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    status: input.status,
    priority: input.priority,
    order: input.order,
    assigneeIds: input.assignees.map((a) => a.uid),
    assigneeSummaries: input.assignees,
    labels: input.labels ?? [],
    subtasks: input.subtasks ?? [],
    attachments: [],
    startDate: input.startDate ? Timestamp.fromDate(new Date(input.startDate)) : null,
    dueDate: input.dueDate ? Timestamp.fromDate(new Date(input.dueDate)) : null,
    completedAt: input.status === 'completed' ? serverTimestamp() : null,
    reminderSent: false,
    commentCount: 0,
    createdBy: input.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return taskRef.id;
}

export async function updateTaskFields(
  workspaceId: string,
  projectId: string,
  taskId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'projects', projectId, 'tasks', taskId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'workspaces', workspaceId, 'projects', projectId, 'tasks', taskId));
}

export function subscribeTaskComments(
  workspaceId: string,
  projectId: string,
  taskId: string,
  onData: (comments: TaskComment[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'projects', projectId, 'tasks', taskId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as TaskComment));
  });
}

export async function addTaskComment(input: {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  message: string;
  mentions?: string[];
}): Promise<void> {
  const refCol = collection(
    db,
    'workspaces',
    input.workspaceId,
    'projects',
    input.projectId,
    'tasks',
    input.taskId,
    'comments',
  );
  const docRef = await addDoc(refCol, {
    id: '',
    userId: input.userId,
    userName: input.userName,
    userPhotoURL: input.userPhotoURL,
    message: input.message.trim(),
    mentions: input.mentions ?? [],
    createdAt: serverTimestamp(),
    editedAt: null,
  });
  await updateDoc(docRef, { id: docRef.id });
}

export async function deleteTaskComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  await deleteDoc(
    doc(
      db,
      'workspaces',
      workspaceId,
      'projects',
      projectId,
      'tasks',
      taskId,
      'comments',
      commentId,
    ),
  );
}

export function subscribeTaskActivity(
  workspaceId: string,
  projectId: string,
  taskId: string,
  onData: (items: TaskActivity[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'workspaces', workspaceId, 'projects', projectId, 'tasks', taskId, 'activity'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as TaskActivity));
  });
}

export async function uploadTaskAttachment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  userId: string,
  file: File,
  existingAttachments: TaskAttachment[],
): Promise<TaskAttachment> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Attachments must be 10 MB or smaller.');
  }
  const attachmentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileRef = ref(
    storage,
    `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/${attachmentId}_${safeName}`,
  );
  await uploadBytes(fileRef, file, { contentType: file.type });
  const url = await getDownloadURL(fileRef);

  const attachment: TaskAttachment = {
    id: attachmentId,
    name: file.name,
    url,
    size: file.size,
    contentType: file.type,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
  };

  await updateTaskFields(workspaceId, projectId, taskId, {
    attachments: [...existingAttachments, attachment],
  });

  return attachment;
}
