
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { add } from 'date-fns';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text();

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
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 500 });
  }

  const event = JSON.parse(body);
  const eventType = event.event;
  const payload = event.payload;

  // 2. Handle the event
  try {
    switch (eventType) {
      case 'subscription.activated':
        // This can be used as a backup if the verify-payment API fails for some reason
        const { subscription: activatedSub, payment: activatedPayment } = payload;
        await updateUserOnSubscriptionEvent(activatedSub.id, activatedPayment.id, 'active');
        break;

      case 'invoice.paid':
        // This is CRUCIAL for handling auto-renewals
        const { subscription: renewedSub, payment: renewalPayment, invoice } = payload;
        
        const userQuery = await db.collection('users').where('razorpay_subscription_id', '==', renewedSub.id).limit(1).get();
        if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();

            const durationMonths = userData.planDurationMonths || 12;
            const currentEndDate = new Date(userData.subscriptionEndDate);
            const newEndDate = add(currentEndDate, { months: durationMonths });

            await userDoc.ref.update({
                subscriptionEndDate: newEndDate.toISOString(),
                razorpay_payment_id: renewalPayment.id,
            });
        }
        break;

      case 'subscription.cancelled':
        const { subscription: cancelledSub } = payload;
        await updateUserOnSubscriptionEvent(cancelledSub.id, null, 'inactive');
        break;
        
      case 'payment.failed':
          // You could implement logic here to notify the user of the failed payment
          console.log('Payment failed:', payload.payment.entity);
          break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function updateUserOnSubscriptionEvent(subscriptionId: string, paymentId: string | null, status: 'active' | 'inactive') {
  const userQuery = await db.collection('users').where('razorpay_subscription_id', '==', subscriptionId).limit(1).get();

  if (!userQuery.empty) {
    const userDoc = userQuery.docs[0];
    const updateData: any = { subscriptionStatus: status };
    if (paymentId) {
        updateData.razorpay_payment_id = paymentId;
    }
    await userDoc.ref.update(updateData);
  } else {
    console.warn(`Webhook received for unknown subscription ID: ${subscriptionId}`);
  }
}
