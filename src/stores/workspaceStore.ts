import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkspaceMember, WorkspaceRole } from '@/types/domain';

interface WorkspaceState {
  activeWorkspaceId: string | null;
  memberships: WorkspaceMember[];
  loading: boolean;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
  setMemberships: (memberships: WorkspaceMember[]) => void;
  setLoading: (loading: boolean) => void;
  getActiveMembership: () => WorkspaceMember | undefined;
  getActiveRole: () => WorkspaceRole | null;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      activeWorkspaceId: null,
      memberships: [],
      loading: true,
      setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setMemberships: (memberships) => {
        const currentId = get().activeWorkspaceId;
        const stillValid = memberships.some((m) => m.workspaceId === currentId);
        set({
          memberships,
          activeWorkspaceId: stillValid
            ? currentId
            : (memberships[0]?.workspaceId ?? null),
          loading: false,
        });
      },
      setLoading: (loading) => set({ loading }),
      getActiveMembership: () => {
        const { memberships, activeWorkspaceId } = get();
        return memberships.find((m) => m.workspaceId === activeWorkspaceId);
      },
      getActiveRole: () => {
        return get().getActiveMembership()?.role ?? null;
      },
      reset: () => set({ activeWorkspaceId: null, memberships: [], loading: false }),
    }),
    {
      name: 'collabtask-workspace',
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    },
  ),
);
