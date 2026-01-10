
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { useMemo, DependencyList} from 'react';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
    if (getApps().length > 0) {
        return getSdks(getApp());
    }

    // When not in a production environment that supports automatic initialization
    // (like Firebase App Hosting), we must initialize with the config object.
    // The `Failed to fetch` error occurs because the app tries to make a Firebase
    // call without being properly configured.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

/**
 * A hook to memoize a Firestore query or document reference.
 * This is crucial to prevent re-renders from causing infinite loops
 * when using `useCollection` or `useDoc`.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
    const memoized = useMemo(factory, deps);
    if (typeof memoized === 'object' && memoized !== null) {
        // This is a bit of a hack to "tag" the memoized object.
        // It helps `useCollection` and `useDoc` to verify that the query/ref
        // has indeed been memoized, preventing accidental infinite loops.
        (memoized as any).__memo = true;
    }
    return memoized;
}

