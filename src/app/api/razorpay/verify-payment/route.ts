
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { add } from 'date-fns';

// This is a server-side only file. Initialize Firebase Admin SDK.
// Make sure to set up GOOGLE_APPLICATION_CREDENTIALS in your environment.
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, userId, plan } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !userId || !plan) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('Razorpay key secret not found in environment variables.');
    }

    // 1. Verify Razorpay signature
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // 2. Signature is valid, update user in Firestore
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isRenewal = userData?.subscriptionStatus === 'active';

    const startDate = (isRenewal && userData?.subscriptionEndDate && new Date(userData.subscriptionEndDate) > new Date()) 
                        ? new Date(userData.subscriptionEndDate) 
                        : new Date();

    const endDate = add(startDate, { months: plan.durationMonths });

    const updateData: any = {
      subscriptionStatus: 'active',
      razorpay_subscription_id,
      razorpay_payment_id,
      planName: plan.name,
      planPrice: plan.price,
      planDurationMonths: plan.durationMonths,
      subscriptionEndDate: endDate.toISOString(),
      subscriptionType: '', // Clear request type
    };
    
    // Only set start date for new subscriptions or lapsed renewals
    if (!isRenewal || !userData?.subscriptionEndDate || new Date(userData.subscriptionEndDate) <= new Date()) {
      updateData.subscriptionStartDate = new Date().toISOString();
    }
    
    await userDocRef.update(updateData);

    return NextResponse.json({ success: true, message: 'Subscription activated' });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
