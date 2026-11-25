import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ProtectedRoute, PublicRoute } from '@/app/routes/ProtectedRoute';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToastViewport } from '@/components/shared/Toast';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';
import { CreateProjectDialog } from '@/features/projects/CreateProjectDialog';
import { MyTasksPage } from '@/features/tasks/MyTasksPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { MembersPage } from '@/features/workspaces/MembersPage';
import { WorkspaceSettingsPage } from '@/features/workspaces/WorkspaceSettingsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { subscribeWorkspaceProjects } from '@/services/firestore/projectService';
import { subscribeNotifications } from '@/services/notifications/notificationService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { AppNotification, Project } from '@/types/domain';

function AuthenticatedWorkspaceRoutes() {
  const navigate = useNavigate();
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false);

  React.useEffect(() => {
    if (!activeWorkspaceId) return undefined;
    return subscribeWorkspaceProjects(activeWorkspaceId, setProjects);
  }, [activeWorkspaceId]);

  React.useEffect(() => {
    if (!firebaseUser) return undefined;
    return subscribeNotifications(firebaseUser.uid, setNotifications);
  }, [firebaseUser]);

  const visibleProjects = activeWorkspaceId ? projects : [];
  const visibleNotifications = firebaseUser ? notifications : [];
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  return (
    <>
      <Routes>
        <Route
          element={
            <AppShell
              projects={visibleProjects}
              unreadCount={unreadCount}
              onCreateProjectClick={() => setCreateProjectOpen(true)}
            />
          }
        >
          <Route index element={<DashboardPage projects={visibleProjects} />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/projects" element={<ProjectsPage projects={visibleProjects} />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/settings" element={<WorkspaceSettingsPage />} />
          <Route
            path="/notifications"
            element={<NotificationsPage notifications={visibleNotifications} />}
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      <CreateProjectDialog
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreated={(id) => navigate(`/projects/${id}`)}
      />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="/*" element={<AuthenticatedWorkspaceRoutes />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <ToastViewport />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
