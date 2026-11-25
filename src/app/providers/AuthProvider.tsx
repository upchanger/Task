import * as React from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/services/firebase/app';
import { ensureUserProfile } from '@/services/auth/authService';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { UserProfile } from '@/types/domain';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setFirebaseUser, setProfile, setInitialized, reset } = useAuthStore();
  const resetWorkspace = useWorkspaceStore((s) => s.reset);

  React.useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        reset();
        resetWorkspace();
        return;
      }

      setFirebaseUser(user);

      try {
        await ensureUserProfile(user);
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
          setInitialized(true);
        });
      } catch {
        setInitialized(true);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [setFirebaseUser, setProfile, setInitialized, reset, resetWorkspace]);

  return <>{children}</>;
}
