import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/services/firebase/app';
import type { UserProfile, NotificationPreferences } from '@/types/domain';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inApp: true,
  push: true,
  taskAssigned: true,
  mentioned: true,
  deadlineApproaching: true,
  taskCompleted: true,
};

export async function ensureUserProfile(user: User, displayNameOverride?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
    return snap.data() as UserProfile;
  }

  const profileData = {
    uid: user.uid,
    email: (user.email ?? '').toLowerCase(),
    displayName: displayNameOverride || user.displayName || 'Team Member',
    photoURL: user.photoURL ?? null,
    jobTitle: null,
    notificationPreferences: DEFAULT_PREFERENCES,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  };

  await setDoc(userRef, profileData);
  const created = await getDoc(userRef);
  return created.data() as UserProfile;
}

export async function registerWithEmail(displayName: string, email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await sendEmailVerification(cred.user);
  await ensureUserProfile(cred.user, displayName);
  return cred.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function updateUserProfile(
  uid: string,
  updates: { displayName: string; jobTitle?: string | null },
): Promise<void> {
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { displayName: updates.displayName });
  }
  await updateDoc(doc(db, 'users', uid), {
    displayName: updates.displayName,
    jobTitle: updates.jobTitle ?? null,
    lastActiveAt: serverTimestamp(),
  });
}

export async function uploadUserAvatar(uid: string, file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Avatar image must be 2 MB or smaller.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP).');
  }

  const ext = file.name.split('.').pop() || 'png';
  const avatarRef = ref(storage, `users/${uid}/avatar/profile_${Date.now()}.${ext}`);
  await uploadBytes(avatarRef, file, { contentType: file.type });
  const url = await getDownloadURL(avatarRef);

  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { photoURL: url });
  }
  await updateDoc(doc(db, 'users', uid), { photoURL: url });
  return url;
}
