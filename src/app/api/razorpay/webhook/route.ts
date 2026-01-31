
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
      case 'subscription.charged':
        const { subscription: chargedSub, payment: chargedPayment } = payload;
        
        const userQuery = await db.collection('users').where('razorpay_subscription_id', '==', chargedSub.id).limit(1).get();

        if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            
            // This event handles BOTH first payment and renewals.
            // We differentiate based on the user's current status.

            if (userData.subscriptionStatus === 'pending_verification') {
                // This is the FIRST successful payment after checkout.
                const startDate = new Date();
                const endDate = add(startDate, { months: userData.planDurationMonths || 12 });

                await userDoc.ref.update({
                    subscriptionStatus: 'active',
                    subscriptionStartDate: startDate.toISOString(),
                    subscriptionEndDate: endDate.toISOString(),
                    razorpay_payment_id: chargedPayment.id, // Update with the latest payment ID
                    subscriptionType: '', // Clear the request type
                });

            } else if (userData.subscriptionStatus === 'active') {
                // This is a successful RENEWAL payment.
                const currentEndDate = new Date(userData.subscriptionEndDate);
                // Ensure we extend from the correct date, even if payment is early
                const newEndDate = add(currentEndDate > new Date() ? currentEndDate : new Date(), { months: userData.planDurationMonths || 12 });

                 await userDoc.ref.update({
                    subscriptionEndDate: newEndDate.toISOString(),
                    razorpay_payment_id: chargedPayment.id, // Update with the latest renewal payment ID
                });
            }
        } else {
             console.warn(`Webhook (subscription.charged) received for unknown subscription ID: ${chargedSub.id}`);
        }
        break;

      case 'subscription.cancelled':
        const { subscription: cancelledSub } = payload;
        const userCancelQuery = await db.collection('users').where('razorpay_subscription_id', '==', cancelledSub.id).limit(1).get();
        if (!userCancelQuery.empty) {
            await userCancelQuery.docs[0].ref.update({ subscriptionStatus: 'inactive' });
        }
        break;
        
      case 'payment.failed':
          console.log('Payment failed webhook:', payload.payment.entity);
          // Optional: Add logic to set user status to 'payment_failed' or notify them.
          break;

      default:
        // console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
