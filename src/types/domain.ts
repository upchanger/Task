import type { Timestamp } from 'firebase/firestore';

export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type ProjectRole = 'lead' | 'editor' | 'viewer';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectVisibility = 'workspace' | 'private';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type StatusCategory = 'todo' | 'in_progress' | 'review' | 'done';

export interface ProjectStatusConfig {
  id: string;
  label: string;
  color: string;
  order: number;
  category: StatusCategory;
}

export interface UserSummary {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  taskAssigned: boolean;
  mentioned: boolean;
  deadlineApproaching: boolean;
  taskCompleted: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  jobTitle: string | null;
  notificationPreferences: NotificationPreferences;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoURL: string | null;
  ownerId: string;
  memberCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceLogoURL: string | null;
  role: WorkspaceRole;
  displayName: string;
  email: string;
  photoURL: string | null;
  joinedAt: Timestamp;
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
  status: InvitationStatus;
  invitedBy: string;
  invitedByName: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  color: string;
  startDate: Timestamp | null;
  deadline: Timestamp | null;
  createdBy: string;
  memberIds: string[];
  statuses: ProjectStatusConfig[];
  taskCount: number;
  completedTaskCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  displayName: string;
  photoURL: string | null;
  addedAt: Timestamp;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskItem {
  id: string;
  workspaceId: string;
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  status: string;
  priority: TaskPriority;
  order: number;
  assigneeIds: string[];
  assigneeSummaries: UserSummary[];
  labels: TaskLabel[];
  subtasks: Subtask[];
  attachments: TaskAttachment[];
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  completedAt: Timestamp | null;
  reminderSent: boolean;
  commentCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  message: string;
  mentions: string[];
  createdAt: Timestamp;
  editedAt: Timestamp | null;
}

export type ActivityType =
  | 'task_created'
  | 'task_assigned'
  | 'priority_changed'
  | 'status_changed'
  | 'deadline_changed'
  | 'comment_added'
  | 'attachment_uploaded';

export interface TaskActivity {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  metadata?: {
    from?: string;
    to?: string;
    targetName?: string;
  };
  createdAt: Timestamp;
}

export type NotificationType =
  | 'task_assigned'
  | 'comment_mention'
  | 'deadline_approaching'
  | 'task_completed'
  | 'workspace_invite'
  | 'project_update';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;
  actorId: string;
  actorName: string;
  read: boolean;
  createdAt: Timestamp;
}
