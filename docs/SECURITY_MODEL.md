# CollabTask — Security Model & Permissions

## 1. Security Principles

1. **Zero-Trust Client**: Frontend role checks are strictly for UX (hiding/disabling buttons). Every read, write, and Storage operation is enforced on the backend by **Firestore Security Rules**, **Storage Security Rules**, and **Cloud Functions**.
2. **Default Deny**: All Firestore paths and Storage buckets deny access by default unless explicitly matched.
3. **Least Privilege & Anti-Escalation**: Users cannot modify their own `role`, `ownerId`, `taskCount`, `completedTaskCount`, `createdAt`, or `createdBy` fields.
4. **App Check**: Enforces that requests originate from our legitimate web app (with debug tokens for local emulator testing).
5. **Secret Isolation**: FCM server keys and Admin SDK credentials exist exclusively in Cloud Functions runtime, never in `src/` or `VITE_*` env vars.

---

## 2. Role-Based Access Control (RBAC) Matrix

### 2.1 Workspace Roles

| Capability | Owner | Admin | Member | Non-Member |
| :--- | :---: | :---: | :---: | :---: |
| View workspace & member list | ✅ | ✅ | ✅ | ❌ |
| Update workspace name/description/logo | ✅ | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Change member roles (`admin` ↔ `member`, transfer `owner`) | ✅ | ❌ | ❌ | ❌ |
| Remove `member` | ✅ | ✅ | ❌ | ❌ |
| Remove `admin` or `owner` | ✅ (admin only) | ❌ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ❌ | ❌ |
| Edit / Archive / Delete any project | ✅ | ✅ | ❌ | ❌ |
| Assign project members | ✅ | ✅ | ❌ | ❌ |
| View workspace-visible projects | ✅ | ✅ | ✅ | ❌ |
| View private projects | ✅ | ✅ | If in `project/members` | ❌ |

### 2.2 Project & Task Permissions

| Capability | Workspace Owner/Admin | Project Lead | Project Editor | Project Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Edit project details | ✅ | ✅ | ❌ | ❌ |
| Create / Edit / Move tasks | ✅ | ✅ | ✅ | ❌ |
| Delete tasks | ✅ | ✅ | Creator only | ❌ |
| Upload attachments | ✅ | ✅ | ✅ | ❌ |
| Post comments | ✅ | ✅ | ✅ | ✅ |
| Edit / Delete own comment | ✅ | ✅ | ✅ | ✅ |
| Delete others' comments | ✅ | ✅ | ❌ | ❌ |

*(Note: When a workspace `member` is added to a workspace-visible project without an explicit project role, their default project role is `editor` unless restricted to `viewer`.)*

---

## 3. Firestore Security Rules Design

### 3.1 Core Helper Functions

```javascript
function isSignedIn() {
  return request.auth != null;
}

function isOwner(userId) {
  return isSignedIn() && request.auth.uid == userId;
}

function workspaceMemberDoc(workspaceId) {
  return get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid));
}

function isWorkspaceMember(workspaceId) {
  return isSignedIn() && exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid));
}

function hasWorkspaceRole(workspaceId, roles) {
  return isWorkspaceMember(workspaceId) && workspaceMemberDoc(workspaceId).data.role in roles;
}

function isProjectMember(workspaceId, projectId) {
  return exists(/databases/$(database)/documents/workspaces/$(workspaceId)/projects/$(projectId)/members/$(request.auth.uid));
}

function canAccessProject(workspaceId, projectId) {
  let project = get(/databases/$(database)/documents/workspaces/$(workspaceId)/projects/$(projectId)).data;
  return hasWorkspaceRole(workspaceId, ['owner', 'admin'])
    || (isWorkspaceMember(workspaceId) && (project.visibility == 'workspace' || isProjectMember(workspaceId, projectId)));
}
```

### 3.2 Protected Fields & Immutability Rules

- **`users/{userId}`**: Read by any authenticated user (or workspace peers); write only by `isOwner(userId)` with `uid == userId` and `createdAt` immutable.
- **`users/{userId}/notifications/{id}`**: Read/update (`read` field only) by `isOwner(userId)`. Create/delete blocked on client (server-only via Admin SDK).
- **`workspaces/{workspaceId}`**: Create allowed by signed-in user if `request.resource.data.ownerId == request.auth.uid` (or via Cloud Function to atomically create the owner `members` doc). Update allowed by `owner`/`admin` provided `ownerId` and `createdAt` are unchanged. Delete blocked on client (handled via `deleteWorkspace` Cloud Function).
- **`workspaces/{workspaceId}/members/{userId}`**: Client writes blocked (`allow write: if false`). All additions, role changes, and removals go through Cloud Functions (`respondInvite`, `updateMemberRole`, `removeMember`) to guarantee anti-escalation and sole-owner protection.
- **`workspaces/{workspaceId}/invitations/{id}`**: Read by workspace `owner`/`admin` or `resource.data.email == request.auth.token.email`. Writes blocked on client (handled via `sendInvite` / `respondInvite` / `revokeInvite` Cloud Functions).
- **`projects/{projectId}`**: Read if `canAccessProject(...)`. Create/Update by workspace `owner`/`admin` (protecting `taskCount`, `completedTaskCount`, `createdAt`, `createdBy`). Delete via Cloud Function.
- **`tasks/{taskId}`**: Read if `canAccessProject(...)`. Create/Update if user has write access to the project, validating `title` length, valid `priority`, and immutable `createdAt`/`createdBy`/`workspaceId`/`projectId`.
- **`tasks/{taskId}/comments/{commentId}`**: Read if `canAccessProject(...)`. Create if `request.resource.data.userId == request.auth.uid`. Update/Delete if `resource.data.userId == request.auth.uid` (or `owner`/`admin` for delete).
- **`tasks/{taskId}/activity/{activityId}`**: Read if `canAccessProject(...)`. Client writes blocked (`allow write: if false`) — generated exclusively by Cloud Functions triggers so audit logs cannot be forged.

---

## 4. Storage Security Rules Design

Storage paths are scoped to enforce tenant and size boundaries:

- `users/{userId}/avatar/{fileName}`:
  - Read: `isSignedIn()`
  - Write: `isOwner(userId)` && `request.resource.size <= 2 * 1024 * 1024` && `request.resource.contentType.matches('image/(jpeg|png|webp|gif)')`
- `workspaces/{workspaceId}/logo/{fileName}`:
  - Read: `isWorkspaceMember(workspaceId)`
  - Write: `hasWorkspaceRole(workspaceId, ['owner', 'admin'])` && `request.resource.size <= 2 * 1024 * 1024` && `request.resource.contentType.matches('image/.*')`
- `workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/{fileName}`:
  - Read: `canAccessProject(workspaceId, projectId)` (via Firestore cross-service rule `firestore.exists(...)` / `firestore.get(...)`)
  - Write: `canAccessProject(workspaceId, projectId)` && `request.resource.size <= 10 * 1024 * 1024` && safe content-type check.

---

## 5. Automated Security Testing Plan

Using `@firebase/rules-unit-testing` and the Firebase Emulator Suite (`tests/security/`):
- Unauthenticated read/write denial across all collections.
- Cross-workspace isolation (User in Workspace A cannot read/write Workspace B).
- Role escalation attempts (Member trying to write `role: 'owner'` or modify `taskCount` or forge `activity` logs).
- Private project access denial for non-project members.
- Notification privacy (User A cannot read or mark User B's notifications).
- Storage size & MIME type rejection tests.
