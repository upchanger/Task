# CollabTask — Phased Implementation Plan

Development proceeds incrementally across 7 phases. Each phase has explicit deliverables and verification gates that must pass before advancing.

---

## Phase 1: Project Foundation
**Goal**: Initialize the application, tooling, folder structure, Firebase SDK wiring, and base UI shell.
- **Deliverables**:
  - Vite + React + TypeScript strict configuration (`tsconfig.json`, `vite.config.ts`).
  - Tailwind CSS + `shadcn/ui` base components + `lucide-react`.
  - ESLint + Prettier configuration.
  - Complete modular folder structure (`src/app`, `src/components`, `src/features`, `src/services`, `src/stores`, `src/types`, `src/schemas`, `functions/`, `firebase/`, `tests/`).
  - `.env.example` and Firebase client initialization with Emulator Suite support and App Check scaffolding.
  - `firebase.json` configuring Auth, Firestore, Functions, Storage emulators.
  - Light/Dark theme provider and responsive `AppShell` layout skeleton.
- **Verification Gate**: `npm run typecheck`, `npm run lint`, and `npm run build` pass with zero errors.

---

## Phase 2: Authentication & User Management
**Goal**: Secure user onboarding, session persistence, profile management, and route protection.
- **Deliverables**:
  - Zod schemas & React Hook Form integration for Login, Register, Password Reset, and Profile Edit.
  - Email/Password registration + login, Google OAuth, Password reset, Email verification banner & resend flow.
  - `users/{uid}` Firestore profile creation & `lastActiveAt` updates.
  - Profile picture upload to Firebase Storage with size/type validation.
  - `ProtectedRoute` and `PublicRoute` wrappers with persistent auth state.
- **Verification Gate**: Typecheck, lint, unit tests for auth schemas, and manual/emulator verification of auth flows.

---

## Phase 3: Workspaces, Memberships & Invitations
**Goal**: Multi-tenant workspace creation, switching, invitations, and RBAC enforcement.
- **Deliverables**:
  - Workspace creation modal/page, workspace settings (name, description, logo upload), and workspace switcher in sidebar.
  - Cloud Functions (`sendInvite`, `respondInvite`, `revokeInvite`, `updateMemberRole`, `removeMember`, `deleteWorkspace`).
  - Invitation inbox (accept/reject) and Member Management screen (role assignment, removal).
  - Initial `firestore.rules`, `storage.rules`, and `firestore.indexes.json`.
- **Verification Gate**: Typecheck, lint, and `@firebase/rules-unit-testing` security tests for workspace isolation and anti-escalation.

---

## Phase 4: Projects & Task Management
**Goal**: Project lifecycle management and full task CRUD with assignments, priorities, labels, and subtasks.
- **Deliverables**:
  - Project listing, creation, editing, archiving, deletion, and project overview dashboard.
  - Project member assignment & visibility (`workspace` vs `private`).
  - Task creation & editing modal/drawer: title, description, multiple assignees, priority (`low`, `medium`, `high`, `urgent`), status (`todo`, `in_progress`, `in_review`, `completed` + extensible schema), start/due dates, labels, subtasks.
  - Cloud Function `onTaskWrite` maintaining `taskCount` and `completedTaskCount`.
  - "My Tasks" page powered by bounded `collectionGroup` query.
- **Verification Gate**: Typecheck, lint, unit tests for task schemas/filters, and emulator rules tests for project/task permissions.

---

## Phase 5: Real-Time Collaboration, Kanban, Comments & Activity
**Goal**: Live multi-user synchronization, drag-and-drop Kanban board, task discussions, and audit history.
- **Deliverables**:
  - Scoped `onSnapshot` hooks with clean unsubscribe and offline/sync status indicator.
  - Collaborative Kanban board (`@dnd-kit`) with fractional-index ordering, optimistic UI updates with rollback on write failure, and filtering/search/sorting (by assignee, priority, label, search query).
  - Task detail slide-over panel with real-time comments (`@mention` support, edit/delete) and chronological activity timeline.
  - Cloud Functions for trustworthy activity log generation (`status_changed`, `priority_changed`, `task_assigned`, `deadline_changed`, `comment_added`).
- **Verification Gate**: Typecheck, lint, unit tests for fractional ordering & optimistic rollback, and multi-tab real-time sync verification.

---

## Phase 6: Advanced Features (Notifications, Attachments, Calendar, Analytics)
**Goal**: Complete SaaS experience with push/in-app notifications, file attachments, calendar view, and analytics.
- **Deliverables**:
  - In-app Notification Center (unread badge, mark as read, mark all as read, preferences) + FCM Web Push (`firebase-messaging-sw.js`) + Cloud Function push dispatcher + hourly scheduled deadline reminder function.
  - Task file attachments (upload to Storage with progress bar, preview/download, delete, activity log).
  - Calendar view (monthly/weekly task deadlines with quick-open task detail).
  - Main Dashboard with KPIs (total projects, total/completed/pending/overdue tasks, assigned to me, upcoming deadlines, recent activity) and Recharts visualizations (completion stats, status distribution, priority distribution, project progress).
- **Verification Gate**: Typecheck, lint, and full feature walkthrough on emulators.

---

## Phase 7: Quality Assurance & Production Readiness
**Goal**: Comprehensive testing, responsive polish, performance audit, and production build verification.
- **Deliverables**:
  - Expanded Vitest unit & integration test suite.
  - Full Firestore & Storage security test suite passing against Firebase Emulator.
  - Responsive layout audit across desktop, tablet, and mobile viewports.
  - Bundle size & query pagination review (no unbounded queries, no `any` types, no placeholder buttons).
  - Updated `README.md` with setup, emulator, and deployment instructions.
- **Verification Gate**: All unit, integration, and security tests pass; `tsc --noEmit`, `eslint`, and `vite build` succeed cleanly.
