
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { App } from 'firebase-admin/app';

// This line is crucial for Vercel. It ensures this route is treated as a dynamic serverless function
// and is not processed at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  
  // Firebase Admin SDK has been removed. The logic to activate user subscriptions based on
  // webhook events is now disabled. This webhook will successfully receive events from Razorpay
  // but will not perform any action.
  
  console.log("Webhook received and verified, but processing is disabled due to Admin SDK removal.");

  const event = JSON.parse(body);
  console.log(`Event type: ${event.event}`);

  // Return a success response to Razorpay to acknowledge receipt.
  return NextResponse.json({ received: true });
}
