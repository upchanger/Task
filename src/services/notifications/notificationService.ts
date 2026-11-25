import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { db, firebaseApp } from '@/services/firebase/app';
import { vapidKey } from '@/services/firebase/config';
import type { AppNotification, NotificationPreferences } from '@/types/domain';

export function subscribeNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => d.data() as AppNotification));
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(
  userId: string,
  unreadIds: string[],
): Promise<void> {
  if (unreadIds.length === 0) return;
  const batch = writeBatch(db);
  unreadIds.forEach((id) => {
    batch.update(doc(db, 'users', userId, 'notifications', id), { read: true });
  });
  await batch.commit();
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    notificationPreferences: preferences,
  });
}

export async function registerPushDevice(userId: string): Promise<boolean> {
  if (!vapidKey || !(await isSupported())) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey });
  if (!token) return false;

  const deviceId = btoa(token).slice(0, 32).replace(/[^a-zA-Z0-9]/g, '_');
  await setDoc(doc(db, 'users', userId, 'devices', deviceId), {
    token,
    platform: 'web',
    userAgent: navigator.userAgent,
    updatedAt: serverTimestamp(),
  });
  return true;
}
