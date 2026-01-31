
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Explicitly mark this as a dynamic Node.js-based serverless function to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Dynamically import Firebase Admin SDK modules to prevent build-time execution
  const { initializeApp, getApps, type App } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  // Helper function is now defined and used inside the handler
  function getFirebaseAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    return initializeApp();
  }

  try {
    const adminApp = getFirebaseAdminApp();
    const db = getFirestore(adminApp);

    const body = await req.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, userId, plan } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !userId || !plan) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('Razorpay key secret not found in environment variables.');
      return NextResponse.json({ error: 'Server configuration error: Razorpay secret is not set.' }, { status: 500 });
    }

    // 1. Verify Razorpay signature
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // 2. Signature is valid, update user in Firestore to a 'pending' state
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isRenewal = userData?.subscriptionStatus === 'active';

    const updateData = {
      subscriptionStatus: 'pending_verification',
      razorpay_subscription_id,
      razorpay_payment_id,
      planName: plan.name,
      planPrice: plan.price,
      planDurationMonths: plan.durationMonths,
      subscriptionRequestDate: new Date().toISOString(),
      subscriptionType: isRenewal ? 'Renew' : 'New',
    };

    await userDocRef.update(updateData);

    return NextResponse.json({ success: true, message: 'Payment verification successful. Awaiting webhook for activation.' });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
