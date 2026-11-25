# CollabTask — System Architecture

## 1. Executive Summary

CollabTask is a real-time collaborative task management SaaS platform inspired by Linear, Trello, and Asana. It enables multi-tenant teams to organize work into **Workspaces**, **Projects**, and **Tasks**, collaborate in real time via Kanban boards, comments, and activity feeds, and receive push/in-app notifications.

The system uses a **React + TypeScript + Vite** single-page application (SPA) backed by **Firebase** (Authentication, Cloud Firestore, Cloud Storage, Cloud Functions v2, Cloud Messaging, and App Check).

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Client Tier (Browser / PWA)                      │
│  React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand      │
│  React Hook Form + Zod + React Router + @dnd-kit + Recharts             │
├─────────────────────────────────────────────────────────────────────────┤
│  Firebase Web SDK (Modular v11+)                                        │
│  • Auth (Email/Password, Google OAuth, Email Verification)              │
│  • Firestore (onSnapshot real-time listeners + IndexedDB offline cache) │
│  • Storage (Direct signed/rule-checked uploads for avatars/attachments) │
│  • Messaging (FCM Web Push via Service Worker)                          │
│  • App Check (reCAPTCHA v3 / Enterprise token attestation)              │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │ HTTPS / WebChannel / gRPC
┌───────────────────────────▼─────────────────────────────────────────────┐
│                       Firebase Backend (BaaS)                           │
│  • Firebase Authentication (Identity & JWT custom/token claims)         │
│  • Cloud Firestore (Multi-tenant NoSQL + Security Rules)                │
│  • Cloud Storage (Binary assets + Storage Security Rules)               │
│  • Cloud Functions v2 (TypeScript — Admin SDK trusted operations)       │
│    ├── Auth triggers (User profile initialization)                      │
│    ├── Callable Functions (Invites, Role updates, Cascade deletes)      │
│    ├── Firestore Triggers (Counters, Activity logs, Notifications)      │
│    └── Scheduled Functions (Deadline reminder notifications)            │
│  • Firebase Cloud Messaging (Push notification delivery)                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Architecture

### 3.1 Modular Folder Structure

```text
collabtask/
├── docs/                           # Architecture, Schema, Security, Plan
├── firebase/
│   ├── firestore.rules             # Firestore Security Rules
│   ├── firestore.indexes.json      # Composite & collectionGroup indexes
│   └── storage.rules               # Cloud Storage Security Rules
├── functions/                      # Firebase Cloud Functions v2 (TypeScript)
│   ├── src/
│   │   ├── auth/                   # User creation & cleanup triggers
│   │   ├── invitations/            # Create, accept, reject, revoke invites
│   │   ├── workspaces/             # Role updates, member removal, cascade delete
│   │   ├── projects/               # Project archive/delete cascades
│   │   ├── tasks/                  # Task counters, activity audit logs
│   │   ├── notifications/          # In-app notification + FCM dispatch
│   │   ├── scheduled/              # Due-soon / overdue cron jobs
│   │   └── utils/                  # Admin SDK init, validators, logger
│   ├── package.json
│   └── tsconfig.json
├── public/
│   └── firebase-messaging-sw.js    # FCM background push service worker
├── src/
│   ├── app/
│   │   ├── providers/              # AuthProvider, ThemeProvider, WorkspaceProvider
│   │   └── routes/                 # Router config, ProtectedRoute, PublicRoute
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (Button, Dialog, etc.)
│   │   ├── layout/                 # AppShell, Sidebar, Topbar, MobileNav
│   │   └── shared/                 # EmptyState, ErrorBoundary, ConfirmDialog, AvatarStack
│   ├── features/
│   │   ├── auth/                   # Login, Register, ResetPassword, VerifyEmail
│   │   ├── dashboard/              # KPI cards, Recharts analytics, recent activity
│   │   ├── workspaces/             # Switcher, Create, Settings, Members, Invites
│   │   ├── projects/               # List, Overview, Create/Edit, Project Members
│   │   ├── tasks/                  # KanbanBoard, TaskCard, TaskDetailSheet, Filters
│   │   ├── comments/               # CommentThread, MentionInput, ActivityTimeline
│   │   ├── notifications/          # NotificationBell, NotificationCenter, Preferences
│   │   ├── calendar/               # Monthly/Weekly task deadline calendar
│   │   └── profile/                # User profile, avatar upload, app settings
│   ├── hooks/                      # Reusable hooks (useFirestoreCollection, useDebounce)
│   ├── services/
│   │   ├── firebase/               # App init, emulator connection, App Check, FCM
│   │   ├── auth/                   # Auth service wrappers
│   │   ├── firestore/              # Typed collection/doc refs & CRUD helpers
│   │   ├── functions/              # Typed httpsCallable wrappers
│   │   ├── storage/                # Upload with progress & validation
│   │   └── notifications/          # FCM token registration & foreground listener
│   ├── stores/                     # Zustand stores (authStore, workspaceStore, uiStore)
│   ├── types/                      # Strict TypeScript domain interfaces
│   ├── schemas/                    # Shared Zod validation schemas
│   ├── utils/                      # Date formatting, fractional rank, error parser
│   └── styles/                     # Tailwind v4/v3 CSS tokens, theme variables
├── tests/
│   ├── unit/                       # Vitest unit tests (utils, schemas, stores)
│   ├── integration/                # Component & hook integration tests
│   └── security/                   # Firestore & Storage rules tests (Emulator)
├── .env.example
├── firebase.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 3.2 State Management Strategy

We separate **Server Real-Time State** from **Client UI State**:
1. **Client UI State (Zustand)**:
   - `useAuthStore`: Current Firebase `User`, hydrated `UserProfile`, auth loading/initialized state.
   - `useWorkspaceStore`: Active `workspaceId`, list of user's workspaces, active user's role in current workspace, persisted in `localStorage` for fast reload.
   - `useUIStore`: Sidebar collapsed state, theme (`light` | `dark` | `system`), active task detail drawer `taskId`, Kanban filter/sort state.
2. **Real-Time Server State (Scoped `onSnapshot` Hooks)**:
   - Managed via dedicated custom hooks (e.g., `useWorkspaceProjects`, `useProjectTasks`, `useTaskComments`, `useNotifications`) that subscribe on mount and **always return the unsubscribe function** on unmount.
   - Deduplication: Listeners are keyed by `(workspaceId, projectId)` at the feature/page level and passed down or stored cleanly so child components do not open duplicate listeners to the same collection.

### 3.3 Drag-and-Drop & Concurrency Control (Kanban)

- **Library**: `@dnd-kit/core` and `@dnd-kit/sortable` for accessible keyboard + pointer drag-and-drop.
- **Ordering**: Tasks use a numeric/lexicographic `order` (fractional indexing) field per status column so moving a card between two cards only updates **one document** (`status` + `order` + `updatedAt`), rather than rewriting every card in the column.
- **Optimistic UI with Rollback**:
  - On drag-end, the UI immediately applies the new `status` and `order` in local optimistic state.
  - `updateDoc()` writes **only** `{ status, order, updatedAt: serverTimestamp() }` (field-level patch, never overwriting title, description, or assignees edited concurrently by another user).
  - If `updateDoc()` rejects (e.g., permission denied or network error), the optimistic state is rolled back and a toast error is displayed.

### 3.4 Real-Time & Offline Behavior

- Firestore is initialized with `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`.
- Connection status is monitored via Firestore metadata (`snapshot.metadata.fromCache` / `hasPendingWrites`) and `navigator.onLine` to display a subtle offline/syncing indicator in the header without blocking UI reads.

---

## 4. Backend Architecture (Cloud Functions v2)

Cloud Functions run with Firebase Admin SDK privileges and handle operations that **cannot be trusted to client security rules**:

| Module | Trigger / Type | Responsibility |
| :--- | :--- | :--- |
| `auth/onUserCreate` | Auth / User trigger (or callable ensureProfile) | Creates `users/{uid}` document with defaults & timestamps |
| `invitations/sendInvite` | `onCall` | Validates caller is `owner`/`admin`, creates `invitations/{id}` with expiry, prevents duplicate pending invites, notifies invited user if registered |
| `invitations/respondInvite` | `onCall` | Atomically verifies email match, adds `workspaces/{wsId}/members/{uid}`, marks invite `accepted`/`rejected`, logs activity |
| `workspaces/updateMemberRole` | `onCall` | Validates caller is `owner`, prevents demoting the sole remaining `owner`, updates role |
| `workspaces/removeMember` | `onCall` | Validates permissions, removes member from workspace and child projects |
| `workspaces/deleteWorkspace` | `onCall` | Owner-only recursive batch delete of workspace subcollections & Storage folder |
| `projects/deleteProject` | `onCall` | Owner/Admin recursive delete of project tasks, comments, activity, and attachments |
| `tasks/onTaskWrite` | Firestore `onDocumentWritten` | Atomically updates `project.taskCount` and `project.completedTaskCount`; writes trustworthy `activity` entries for status, priority, assignee, and deadline changes |
| `comments/onCommentCreate` | Firestore `onDocumentCreated` | Writes `comment_added` activity entry; parses `@mentions` and dispatches notifications |
| `notifications/dispatchPush` | Firestore `onDocumentCreated` | Reads user notification preferences and `devices/{deviceId}` FCM tokens; sends multicast push via `firebase-admin/messaging`; prunes invalid tokens |
| `scheduled/deadlineReminders` | `onSchedule` (`every 1 hours`) | Queries tasks due within 24 hours with `reminderSent == false`, sends deadline notifications, marks `reminderSent = true` to prevent duplicates |

---

## 5. Required Firebase Configuration & Environment Variables

No Firebase credentials are hardcoded or committed. The frontend reads configuration from `.env.local` (documented in `.env.example`):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_RECAPTCHA_SITE_KEY=
VITE_USE_FIREBASE_EMULATORS=true
```

> **Note**: When `VITE_USE_FIREBASE_EMULATORS=true` in development, the app connects to local Auth (`9099`), Firestore (`8080`), Functions (`5001`), and Storage (`9199`) emulators automatically, allowing full end-to-end development and testing before or alongside a live Firebase project.

---

## 6. Cost, Performance & Scalability Analysis

| Concern | Mitigation Strategy |
| :--- | :--- |
| **Unbounded Listener Reads** | Task lists and notifications use paginated/bounded queries (`limit(50)` for notifications, `limit(100)` active tasks per project view with archive filtering). Comments paginate with `limit(30)` + "Load older". |
| **Document Size Limit (1 MiB)** | Comments, activity logs, subtasks (if large, or capped), and members are stored in **subcollections**, never as unbounded arrays inside task or project documents. |
| **N+1 User Profile Lookups** | Task cards and comments store lightweight denormalized `assigneeSummaries` / `authorSummary` (`{ uid, displayName, photoURL }`), eliminating N+1 reads of `users/{uid}`. |
| **Counter Contention** | Project `taskCount` and `completedTaskCount` are maintained via Cloud Function `FieldValue.increment()` updates on task create/update/delete, avoiding full-collection count queries on every dashboard render. |
| **Duplicate Notifications** | Scheduled deadline reminders set `reminderSent: true` transactionally; assignment notifications check `before.assigneeIds` vs `after.assigneeIds` diff and exclude the actor (`actorId !== recipientId`). |
| **Storage Egress & Abuse** | Storage rules enforce `<= 10 MB` per attachment (`<= 2 MB` for avatars/logos) and strict MIME allowlists (`image/*`, `application/pdf`, `text/*`, office docs). |

---

## 7. Key Architectural Decisions (ADRs)

1. **ADR-001: Subcollection-first multi-tenancy under `workspaces/{workspaceId}`** — Isolates tenant data cleanly, simplifies security rules via path-based `workspaceId`, and enables clean cascading deletes.
2. **ADR-002: Workspace-level + Project-level membership** — Workspace `owner` and `admin` have implicit access to all workspace projects; `member` users access projects where they are listed in `projects/{projectId}/members/{uid}` (or if the project is marked `visibility: 'workspace'`).
3. **ADR-003: Custom Statuses via Project-level `statuses` Configuration** — Default statuses (`todo`, `in_progress`, `in_review`, `completed`) are seeded on project creation with a `category` mapping (`todo | in_progress | review | done`), allowing future custom columns without breaking analytics or completion counters.
4. **ADR-004: Hybrid Security Enforcement** — Simple, high-frequency user operations (editing a task title, posting a comment, dragging a Kanban card) write directly to Firestore validated by strict Security Rules. Privileged/multi-document operations (invitations, role changes, cascades, audit logs) execute via Cloud Functions.
