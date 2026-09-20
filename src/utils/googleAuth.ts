import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Check if Google API / Firebase is configured with a valid API key
export const isGoogleApiConfigured = (): boolean => {
  return Boolean(
    firebaseConfig &&
    typeof firebaseConfig.apiKey === 'string' &&
    firebaseConfig.apiKey.trim().length > 0 &&
    !firebaseConfig.apiKey.includes('YOUR_')
  );
};

// Lazy initialization of Firebase App and Auth
let appInstance: any = null;
let authInstance: any = null;

export const getAuthInstance = () => {
  if (!isGoogleApiConfigured()) {
    return null;
  }
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
  }
  return authInstance;
};

// Backwards compatibility export
export const auth = {
  get currentUser() {
    const a = getAuthInstance();
    return a ? a.currentUser : null;
  },
};

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Flag to indicate if sign-in is in progress
let isSigningIn = false;
// In-memory cache for the OAuth access token (per security mandate, not stored in storage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const instance = getAuthInstance();
  if (!instance) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(instance, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (onAuthFailure && !isSigningIn) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const instance = getAuthInstance();
  if (!instance) {
    throw new Error('Google API credentials have been removed from the application.');
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(instance, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google sign-in.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleLogout = async (): Promise<void> => {
  const instance = getAuthInstance();
  if (instance) {
    await signOut(instance);
  }
  cachedAccessToken = null;
};
