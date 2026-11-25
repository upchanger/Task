# CollabTask — Firestore Database Schema

## 1. Collection Hierarchy

```text
users/{userId}
├── notifications/{notificationId}
└── devices/{deviceId}

workspaces/{workspaceId}
├── members/{userId}
├── invitations/{invitationId}
└── projects/{projectId}
    ├── members/{userId}
    └── tasks/{taskId}
        ├── comments/{commentId}
        └── activity/{activityId}
```

---

## 2. Collection Schemas

### 2.1 `users/{userId}`
Stores public/semi-public user profile and notification preferences.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | Yes | Matches Firebase Auth UID |
| `email` | `string` | Yes | Lowercase normalized email |
| `displayName` | `string` | Yes | Full name (2–80 chars) |
| `photoURL` | `string \| null` | No | Profile picture URL (Storage or OAuth) |
| `jobTitle` | `string \| null` | No | Optional role/title |
| `notificationPreferences` | `object` | Yes | `{ inApp: boolean, push: boolean, taskAssigned: boolean, mentioned: boolean, deadlineApproaching: boolean, taskCompleted: boolean }` |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |
| `lastActiveAt` | `Timestamp` | Yes | Updated on session start/activity |

---

### 2.2 `users/{userId}/notifications/{notificationId}`
User-private in-app notifications.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `type` | `string` | Yes | `'task_assigned' \| 'comment_mention' \| 'deadline_approaching' \| 'task_completed' \| 'workspace_invite' \| 'project_update'` |
| `title` | `string` | Yes | Short notification heading |
| `body` | `string` | Yes | Human-readable summary |
| `workspaceId` | `string \| null` | No | Deep-link context |
| `projectId` | `string \| null` | No | Deep-link context |
| `taskId` | `string \| null` | No | Deep-link context |
| `actorId` | `string` | Yes | UID of user who triggered the event |
| `actorName` | `string` | Yes | Denormalized actor display name |
| `read` | `boolean` | Yes | Default `false` |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.3 `users/{userId}/devices/{deviceId}`
FCM registration tokens per user device/browser.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | Yes | FCM registration token |
| `platform` | `string` | Yes | `'web'` |
| `userAgent` | `string` | No | Browser identifier |
| `updatedAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.4 `workspaces/{workspaceId}`
Top-level tenant entity.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `name` | `string` | Yes | Workspace name (2–60 chars) |
| `slug` | `string` | Yes | URL-safe identifier |
| `description` | `string` | No | Up to 500 chars |
| `logoURL` | `string \| null` | No | Storage URL for workspace logo |
| `ownerId` | `string` | Yes | UID of primary owner |
| `memberCount` | `number` | Yes | Maintained by Cloud Functions |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |
| `updatedAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.5 `workspaces/{workspaceId}/members/{userId}`
Authoritative workspace membership and role record. Queried via `collectionGroup('members')` on `userId == auth.uid` to list all workspaces a user belongs to.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | Matches document ID and Auth UID |
| `workspaceId` | `string` | Yes | Parent workspace ID (needed for `collectionGroup` queries) |
| `workspaceName` | `string` | Yes | Denormalized for fast workspace switcher rendering |
| `workspaceLogoURL` | `string \| null` | No | Denormalized workspace logo |
| `role` | `string` | Yes | `'owner' \| 'admin' \| 'member'` |
| `displayName` | `string` | Yes | Denormalized user name |
| `email` | `string` | Yes | Denormalized user email |
| `photoURL` | `string \| null` | No | Denormalized user avatar |
| `joinedAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.6 `workspaces/{workspaceId}/invitations/{invitationId}`
Pending and historical workspace invitations. Queried via `collectionGroup('invitations')` where `email == auth.token.email` and `status == 'pending'`.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `workspaceId` | `string` | Yes | Parent workspace ID |
| `workspaceName` | `string` | Yes | Denormalized for invitee preview |
| `email` | `string` | Yes | Lowercase invitee email |
| `role` | `string` | Yes | `'admin' \| 'member'` |
| `status` | `string` | Yes | `'pending' \| 'accepted' \| 'rejected' \| 'revoked'` |
| `invitedBy` | `string` | Yes | UID of inviter |
| `invitedByName` | `string` | Yes | Denormalized inviter name |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |
| `expiresAt` | `Timestamp` | Yes | `createdAt + 7 days` |

---

### 2.7 `workspaces/{workspaceId}/projects/{projectId}`
Projects within a workspace.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `workspaceId` | `string` | Yes | Parent workspace ID |
| `name` | `string` | Yes | Project name (2–80 chars) |
| `description` | `string` | No | Project overview/scope |
| `status` | `string` | Yes | `'active' \| 'on_hold' \| 'completed' \| 'archived'` |
| `visibility` | `string` | Yes | `'workspace' \| 'private'` (private restricts to project members + ws admins/owners) |
| `color` | `string` | Yes | Hex color badge |
| `startDate` | `Timestamp \| null` | No | Planned start date |
| `deadline` | `Timestamp \| null` | No | Target completion date |
| `createdBy` | `string` | Yes | Creator UID |
| `memberIds` | `string[]` | Yes | Array of UIDs for fast `array-contains` filtering (capped at project team size) |
| `statuses` | `ProjectStatusConfig[]` | Yes | Ordered column definitions: `{ id, label, color, order, category: 'todo' \| 'in_progress' \| 'review' \| 'done' }` |
| `taskCount` | `number` | Yes | Server-maintained total non-deleted tasks |
| `completedTaskCount` | `number` | Yes | Server-maintained tasks in `'done'` category |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |
| `updatedAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.8 `workspaces/{workspaceId}/projects/{projectId}/members/{userId}`
Explicit project-level membership & role.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userId` | `string` | Yes | Auth UID |
| `role` | `string` | Yes | `'lead' \| 'editor' \| 'viewer'` |
| `displayName` | `string` | Yes | Denormalized name |
| `photoURL` | `string \| null` | No | Denormalized avatar |
| `addedAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.9 `workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}`
Core task entity.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `workspaceId` | `string` | Yes | Parent workspace ID (for `collectionGroup` "My Tasks" & Dashboard queries) |
| `projectId` | `string` | Yes | Parent project ID |
| `projectName` | `string` | Yes | Denormalized for "My Tasks" / Calendar views |
| `title` | `string` | Yes | Task title (1–160 chars) |
| `description` | `string` | No | Markdown/rich text description |
| `status` | `string` | Yes | Status key (default: `'todo' \| 'in_progress' \| 'in_review' \| 'completed'`) |
| `priority` | `string` | Yes | `'low' \| 'medium' \| 'high' \| 'urgent'` |
| `order` | `number` | Yes | Fractional index for Kanban column ordering |
| `assigneeIds` | `string[]` | Yes | Array of assigned user UIDs (supports multiple assignees & `array-contains` queries) |
| `assigneeSummaries` | `UserSummary[]` | Yes | `[{ uid, displayName, photoURL }]` |
| `labels` | `TaskLabel[]` | Yes | `[{ id, name, color }]` |
| `subtasks` | `Subtask[]` | Yes | Bounded checklist (`[{ id, title, completed }]`, max 50 items) |
| `attachments` | `Attachment[]` | Yes | `[{ id, name, url, size, contentType, uploadedBy, uploadedAt }]` |
| `startDate` | `Timestamp \| null` | No | Optional start date |
| `dueDate` | `Timestamp \| null` | No | Optional due date |
| `completedAt` | `Timestamp \| null` | No | Set when moved to completed status |
| `reminderSent` | `boolean` | Yes | Prevents duplicate deadline notifications |
| `commentCount` | `number` | Yes | Maintained on comment create/delete |
| `createdBy` | `string` | Yes | Creator UID |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |
| `updatedAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

### 2.10 `workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `userId` | `string` | Yes | Author UID |
| `userName` | `string` | Yes | Denormalized author name |
| `userPhotoURL` | `string \| null` | No | Denormalized author avatar |
| `message` | `string` | Yes | Comment body (1–4000 chars) |
| `mentions` | `string[]` | Yes | Extracted mentioned UIDs |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |
| `editedAt` | `Timestamp \| null` | No | Set on edit |

---

### 2.11 `workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/activity/{activityId}`
Immutable chronological audit trail. Written by Cloud Functions (for server-verified events) or strictly validated rules.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | Document ID |
| `type` | `string` | Yes | `'task_created' \| 'task_assigned' \| 'priority_changed' \| 'status_changed' \| 'deadline_changed' \| 'comment_added' \| 'attachment_uploaded'` |
| `actorId` | `string` | Yes | UID of user who performed the action |
| `actorName` | `string` | Yes | Denormalized actor name |
| `metadata` | `object` | No | `{ from?: string, to?: string, targetName?: string }` |
| `createdAt` | `Timestamp` | Yes | `serverTimestamp()` |

---

## 3. Required Composite & Collection Group Indexes

`firebase/firestore.indexes.json` will define:
1. **Collection Group `members`**: `(userId ASC, joinedAt DESC)` — Lists all workspaces for the logged-in user.
2. **Collection Group `invitations`**: `(email ASC, status ASC, createdAt DESC)` — Lists pending invitations for the logged-in user.
3. **Collection Group `tasks`**:
   - `(workspaceId ASC, assigneeIds CONTAINS, dueDate ASC)` — "My Tasks" & Dashboard assigned tasks.
   - `(workspaceId ASC, dueDate ASC)` — Calendar & upcoming deadlines.
   - `(dueDate ASC, reminderSent ASC)` — Scheduled Cloud Function deadline reminder query.
4. **Project `tasks`**:
   - `(status ASC, order ASC)` — Kanban column ordering.
   - `(assigneeIds CONTAINS, status ASC, order ASC)` — Filtered Kanban.
5. **User `notifications`**: `(read ASC, createdAt DESC)` — Unread notification count & feed.

---

## 4. Denormalization & Consistency Decisions

- **Why denormalize `assigneeSummaries`, `userName`, `projectName`, `workspaceName`?**
  - Rendering a 50-card Kanban board with avatars would otherwise require up to 50–150 extra `getDoc(users/{uid})` reads on every load. Denormalizing `{ uid, displayName, photoURL }` keeps board loads to **1 collection query**.
  - When a user updates their profile (`displayName` or `photoURL`) or a workspace updates its `name`/`logoURL`, a background Cloud Function fans out updates to `members` documents asynchronously.
- **Why `collectionGroup('tasks')` with `workspaceId`?**
  - Allows the "My Tasks", "Calendar", and "Dashboard" screens to query all tasks in the active workspace in a single bounded query instead of iterating over N projects and opening N listeners.
