import { FirebaseError } from 'firebase/app';

const FIREBASE_ERROR_MAP: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested item could not be found.',
  'unauthenticated': 'Please sign in to continue.',
  'unavailable': 'Service temporarily unavailable. Changes will sync when reconnected.',
};

/** Convert Firebase and generic errors into clear, actionable user messages. */
export function getReadableErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof FirebaseError) {
    return FIREBASE_ERROR_MAP[error.code] ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}
