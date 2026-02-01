
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

  // 2. Process only the `order.paid` event
  if (event.event === 'order.paid') {
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      initializeFirebaseAdmin();
      const adminFirestore = getFirestore();
      
      const order = event.payload.order.entity;
      const payment = event.payload.payment.entity;
      
      const { userId, planId } = order.notes;

      if (!userId || !planId) {
        console.warn(`Webhook received for order.paid without userId or planId in notes. Order ID: ${order.id}`);
        return NextResponse.json({ received: true, message: 'Order processed, but missing user/plan details.' });
      }

      const userDocRef = adminFirestore.collection('users').doc(userId);
      const planDocRef = adminFirestore.collection('global/plans/all').doc(planId);
      
      const [userDoc, planDoc] = await Promise.all([userDocRef.get(), planDocRef.get()]);

      if (!userDoc.exists) {
        console.warn(`Webhook: User not found for ID: ${userId}`);
        return NextResponse.json({ received: true, message: 'User for order not found.' });
      }
      if (!planDoc.exists) {
        console.error(`Webhook: Plan not found for ID: ${planId}`);
        return NextResponse.json({ received: true, message: `Plan ${planId} not found`});
      }
      
      const userData = userDoc.data();
      const planData = planDoc.data();

      // Idempotency Check: If we have already processed this payment, ignore the webhook.
      if (userData?.razorpay_payment_id === payment.id) {
          console.log(`Webhook: Payment ID ${payment.id} already processed for user ${userId}. Skipping.`);
          return NextResponse.json({ received: true, message: 'Duplicate webhook ignored.' });
      }
      
      const now = new Date();
      const isRenewal = userData?.subscriptionStatus === 'active' || userData?.subscriptionStatus === 'inactive';
      
      // If renewing, start new plan from end of current one, otherwise start now.
      const currentEndDate = userData?.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : now;
      const startDate = isRenewal && currentEndDate > now ? currentEndDate : now;
      
      const endDate = add(startDate, { months: planData.durationMonths });

      await userDoc.ref.update({
        subscriptionStatus: 'active',
        subscriptionEndDate: endDate.toISOString(),
        subscriptionStartDate: startDate.toISOString(),
        razorpay_payment_id: payment.id, // Log the latest payment ID
        planName: planData.name,
        planPrice: planData.price,
        planDurationMonths: planData.durationMonths,
        subscriptionType: isRenewal ? 'Renew' : 'New',
      });

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      // Return a 500 so Razorpay might retry, but log the error for debugging.
      return NextResponse.json({ error: 'Internal server error processing webhook.' }, { status: 500 });
    }
  }

  // 3. Acknowledge receipt to Razorpay for any other events
  return NextResponse.json({ received: true });
}

    