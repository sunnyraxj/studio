
'use server';

import type { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { add } from 'date-fns';
import { revalidatePath } from 'next/cache';

// This helper should be securely stored and configured.
// For this example, it's defined here for simplicity.
function initializeFirebaseAdmin(): App {
  // We are dynamically importing firebase-admin and its dependencies to avoid
  // trying to load them at build time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps, cert } = require('firebase-admin/app');

  if (getApps().length) {
    return getApps()[0];
  }
  
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountEnv);

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function adjustPlanDuration(userId: string, days: number, reason: string) {
  // In a production app, you MUST verify that the user making this request is an admin.
  // This could be done by verifying a Firebase ID token and checking custom claims.
  // For this context, we assume the page-level security is sufficient.

  if (!userId || !days || !reason) {
      return { success: false, message: "User ID, days, and reason are required." };
  }

  try {
    const adminApp = initializeFirebaseAdmin();
    const adminFirestore = getFirestore(adminApp);

    const userDocRef = adminFirestore.collection('users').doc(userId);
    const notificationRef = userDocRef.collection('notifications').doc();

    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    // If there's no end date, or the plan is inactive, start from today.
    const currentEndDate = (userData?.subscriptionStatus === 'active' && userData?.subscriptionEndDate) 
        ? new Date(userData.subscriptionEndDate) 
        : new Date();
    
    if (isNaN(currentEndDate.getTime())) {
        throw new Error("Invalid current subscription end date.");
    }

    const newEndDate = add(currentEndDate, { days });

    const notificationMessage = days > 0 
        ? `An administrator has granted you a bonus of ${days} day(s). Reason: ${reason}`
        : `An administrator has applied a penalty of ${Math.abs(days)} day(s) to your plan. Reason: ${reason}`;
    
    const notification = {
        id: notificationRef.id,
        date: new Date().toISOString(),
        message: notificationMessage,
        type: days > 0 ? 'bonus' : 'penalty',
        seen: false
    };

    const batch = adminFirestore.batch();
    
    // Also ensure status is active if we are adding days to an inactive plan
    const updateData: { subscriptionEndDate: string, subscriptionStatus?: 'active' } = {
        subscriptionEndDate: newEndDate.toISOString()
    };
    if (days > 0 && userData?.subscriptionStatus !== 'active') {
        updateData.subscriptionStatus = 'active';
        // If activating a new plan, set start date
        if (!userData?.subscriptionStartDate) {
            (updateData as any).subscriptionStartDate = new Date().toISOString();
        }
    }
    
    batch.update(userDocRef, updateData);
    batch.set(notificationRef, notification);

    await batch.commit();

    revalidatePath('/admin/shops');
    revalidatePath('/dashboard');

    return { success: true, message: `Successfully adjusted plan for user.` };

  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
