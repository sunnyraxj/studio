
import { NextRequest, NextResponse } from 'next/server';
import { razorpayInstance } from '@/lib/razorpay';
import type { App } from 'firebase-admin/app';

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
  try {
    if (!razorpayInstance) {
      throw new Error('Razorpay is not configured. Please set API keys in environment variables.');
    }
    
    const { planId, userId } = await req.json();

    if (!planId || !userId) {
      return NextResponse.json({ error: 'Plan ID and User ID are required' }, { status: 400 });
    }
    
    const { getFirestore } = await import('firebase-admin/firestore');
    initializeFirebaseAdmin();
    const adminFirestore = getFirestore();
    
    const planDoc = await adminFirestore.collection('global/plans/all').doc(planId).get();
    if (!planDoc.exists) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = planDoc.data();
    
    if (!plan || !plan.price) {
        return NextResponse.json({ error: 'Plan price is not defined' }, { status: 500 });
    }

    const options = {
      amount: plan.price * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
      notes: {
          userId: userId,
          planId: planId
      }
    };
    
    const order = await razorpayInstance.orders.create(options);

    return NextResponse.json(order);

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

    