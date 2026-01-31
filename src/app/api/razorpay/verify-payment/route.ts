
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { App } from 'firebase-admin/app';
import { add } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper function to initialize Firebase Admin SDK only once.
function initializeFirebaseAdmin(): App {
  // We are dynamically importing firebase-admin and its dependencies to avoid
  // trying to load them at build time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps, cert } = require('firebase-admin/app');

  if (getApps().length) {
    return getApps()[0];
  }

  // The service account key is securely stored in a Vercel environment variable.
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { 
        razorpay_payment_id, 
        razorpay_subscription_id, 
        razorpay_signature,
        userId,
        plan,
        isRenewal,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !userId || !plan) {
      return NextResponse.json({ error: 'Missing required parameters for verification' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('Razorpay key secret not found in environment variables.');
      return NextResponse.json({ error: 'Server configuration error: Razorpay secret is not set.' }, { status: 500 });
    }

    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }
    
    // --- Signature Verified, Activate Subscription in Firestore ---
    
    // Dynamically import Firestore modules only when needed
    const { getFirestore } = await import('firebase-admin/firestore');
    
    initializeFirebaseAdmin();
    const adminFirestore = getFirestore();
    const userDocRef = adminFirestore.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const now = new Date();
    
    // If it's a renewal and the old plan is still active, extend from the old expiry date.
    // Otherwise, start from today.
    const currentEndDate = userData?.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : now;
    const startDate = isRenewal && currentEndDate > now ? currentEndDate : now;
    
    const endDate = add(startDate, { months: plan.durationMonths });

    const subscriptionData = {
        subscriptionStatus: 'active',
        planName: plan.name,
        planPrice: plan.price,
        planDurationMonths: plan.durationMonths,
        razorpay_payment_id: razorpay_payment_id,
        razorpay_subscription_id: razorpay_subscription_id,
        subscriptionRequestDate: new Date().toISOString(),
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        subscriptionType: isRenewal ? 'Renew' : 'New',
    };

    await userDocRef.update(subscriptionData);

    return NextResponse.json({ success: true, message: 'Subscription activated successfully.' });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment and activating subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
