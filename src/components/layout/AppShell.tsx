import * as React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Bell,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { logoutUser } from '@/services/auth/authService';
import { subscribeUserWorkspaces } from '@/services/firestore/workspaceService';
import { Avatar } from '@/components/ui/Avatar';
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher';
import { CreateWorkspaceDialog } from '@/features/workspaces/CreateWorkspaceDialog';
import { cn } from '@/utils/cn';
import type { Project } from '@/types/domain';

interface AppShellProps {
  projects: Project[];
  unreadCount: number;
  onCreateProjectClick?: () => void;
}

export function AppShell({ projects, unreadCount, onCreateProjectClick }: AppShellProps) {
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuthStore();
  const { setMemberships, getActiveRole } = useWorkspaceStore();
  const {
    theme,
    setTheme,
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
    searchQuery,
    setSearchQuery,
  } = useUIStore();

  const [createWsOpen, setCreateWsOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  React.useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  React.useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeUserWorkspaces(
      firebaseUser.uid,
      (memberships) => {
        setMemberships(memberships);
      },
      (err) => {
        console.error('Failed to load workspaces:', err);
      },
    );
    return () => unsub();
  }, [firebaseUser, setMemberships]);

  const activeRole = getActiveRole();
  const canManage = activeRole === 'owner' || activeRole === 'admin';
  const activeProjects = projects.filter((p) => p.status !== 'archived');

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/members', label: 'Team Members', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between p-3">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher
              collapsed={sidebarCollapsed}
              onCreateClick={() => setCreateWsOpen(true)}
            />
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] lg:inline-flex cursor-pointer"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] shadow-2xs border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60 hover:text-[var(--text-primary)]',
                    sidebarCollapsed && 'justify-center px-2',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div>
            <div className="mb-1.5 flex items-center justify-between px-2.5">
              <span className="text-xs font-medium text-[var(--text-muted)]">Projects</span>
              {canManage && onCreateProjectClick && (
                <button
                  type="button"
                  onClick={onCreateProjectClick}
                  className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="New project"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {activeProjects.length === 0 ? (
                <p className="px-2.5 py-1.5 text-xs text-[var(--text-muted)]">No projects yet</p>
              ) : (
                activeProjects.slice(0, 8).map((project) => (
                  <NavLink
                    key={project.id}
                    to={`/projects/${project.id}`}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                        isActive
                          ? 'bg-[var(--bg-surface)] font-medium text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/60',
                      )
                    }
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </NavLink>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-3">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl p-1.5',
            sidebarCollapsed && 'justify-center',
          )}
        >
          <Link
            to="/profile"
            onClick={() => setMobileNavOpen(false)}
            className="flex min-w-0 flex-1 items-center gap-2.5 hover:opacity-80"
          >
            <Avatar
              src={profile?.photoURL}
              name={profile?.displayName ?? firebaseUser?.email ?? 'User'}
              size="sm"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {profile?.displayName ?? 'Team Member'}
                </p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  {profile?.jobTitle || activeRole || 'No workspace'}
                </p>
              </div>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--accent-coral)] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] transition-all duration-200 lg:block',
          sidebarCollapsed ? 'w-[68px]' : 'w-[244px]',
        )}
      >
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1 text-[var(--text-muted)]"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {format(new Date(), 'EEEE, do MMMM yyyy')}
              </p>
            </div>
          </div>

          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or projects..."
              className="h-9 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {!isOnline && (
              <span
                title="Offline mode — changes will sync automatically"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-amber-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent-amber)]"
              >
                <WifiOff className="h-3.5 w-3.5" />
                Offline
              </span>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <CreateWorkspaceDialog open={createWsOpen} onClose={() => setCreateWsOpen(false)} />
    </div>
  );
}
