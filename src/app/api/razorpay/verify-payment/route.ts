
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { App } from 'firebase-admin/app';

// This line is crucial for Vercel. It ensures this route is treated as a dynamic serverless function
// and is not processed at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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

    // Firebase Admin SDK has been removed. The logic to update user status to "pending_verification"
    // has been disabled. The client will be redirected to the pending page, but the user's
    // document will not be updated here. This will break the automated subscription flow.

    return NextResponse.json({ success: true, message: 'Signature verified, but automatic activation is disabled.' });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
