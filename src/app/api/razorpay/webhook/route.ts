
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { App } from 'firebase-admin/app';
import { add } from 'date-fns';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper function to initialize Firebase Admin SDK only once per serverless function instance.
function initializeFirebaseAdmin(): App {
  // We are dynamically importing firebase-admin and its dependencies to avoid
  // trying to load them at build time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps, cert } = require('firebase-admin/app');

  if (getApps().length) {
    return getApps()[0];
  }
  
  // The service account key is securely stored in a Vercel environment variable.
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountEnv);

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set in environment variables.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text(); // Get raw body for signature verification

  // 1. Verify Webhook Signature
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error) {
     console.error('Error during signature verification:', error);
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 500 });
  }
  
  const event = JSON.parse(body);

  // 2. Process only the `subscription.charged` event
  if (event.event === 'subscription.charged') {
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      initializeFirebaseAdmin();
      const adminFirestore = getFirestore();
      
      const subscription = event.payload.subscription.entity;
      const payment = event.payload.payment.entity;
      
      // Find the user associated with this subscription
      const usersRef = adminFirestore.collection('users');
      const userQuery = usersRef.where('razorpay_subscription_id', '==', subscription.id).limit(1);
      const userSnapshot = await userQuery.get();

      if (userSnapshot.empty) {
        console.warn(`Webhook received for unknown subscription ID: ${subscription.id}`);
        // Still return success to Razorpay to prevent retries for this case.
        return NextResponse.json({ received: true, message: 'User for subscription not found.' });
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      
      const now = new Date();
      // If the old plan is still active, extend from the old expiry date. Otherwise, start from now.
      const currentEndDate = userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : now;
      const startDate = currentEndDate > now ? currentEndDate : now;
      
      // Assume 1 month renewal per charge. For more complex plans, you would look up the plan details.
      const planDurationMonths = userData.planDurationMonths || 1;
      const newEndDate = add(startDate, { months: planDurationMonths });

      await userDoc.ref.update({
        subscriptionStatus: 'active',
        subscriptionEndDate: newEndDate.toISOString(),
        subscriptionStartDate: startDate.toISOString(), // Update start date for renewal period
        razorpay_payment_id: payment.id, // Log the latest payment ID
      });

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      // Return a 500 so Razorpay might retry, but log the error for debugging.
      return NextResponse.json({ error: 'Internal server error processing webhook.' }, { status: 500 });
    }
  }

  // 3. Acknowledge receipt to Razorpay
  return NextResponse.json({ received: true });
}
