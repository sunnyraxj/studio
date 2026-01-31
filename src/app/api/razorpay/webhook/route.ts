
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { add } from 'date-fns';

// This line is crucial for Vercel. It ensures this route is treated as a dynamic serverless function
// and is not processed at build time.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Dynamically import Firebase Admin SDK modules to prevent build-time execution
  const { initializeApp, getApps, type App } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  // Helper function to initialize Firebase Admin SDK only once per serverless function instance.
  function getFirebaseAdminApp(): App {
      if (getApps().length > 0) {
          return getApps()[0];
      }
      return initializeApp();
  }

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
  
  // Initialize Firebase Admin SDK *inside* the request handler
  const adminApp = getFirebaseAdminApp();
  const db = getFirestore(adminApp);

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
            
            // Differentiate between a new subscription and a renewal
            if (userData.subscriptionType === 'New' && userData.subscriptionStatus === 'pending_verification') {
                // New subscription activation
                const startDate = new Date();
                const endDate = add(startDate, { months: userData.planDurationMonths || 12 });

                await userDoc.ref.update({
                    subscriptionStatus: 'active',
                    subscriptionStartDate: startDate.toISOString(),
                    subscriptionEndDate: endDate.toISOString(),
                    razorpay_payment_id: chargedPayment.entity.id, // Correctly access the nested payment ID
                    subscriptionType: '', // Clear the request type
                });

            } else if (userData.subscriptionType === 'Renew' || userData.subscriptionStatus === 'active') {
                // Renewal for an active or recently expired subscription
                const currentEndDate = userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate) : new Date();
                // Extend from the current end date if it's in the future, otherwise extend from today.
                const newStartDate = currentEndDate > new Date() ? currentEndDate : new Date();
                const newEndDate = add(newStartDate, { months: userData.planDurationMonths || 12 });

                await userDoc.ref.update({
                    subscriptionStatus: 'active', // Ensure it's active
                    subscriptionEndDate: newEndDate.toISOString(),
                    // Only update start date if the old plan had already expired
                    subscriptionStartDate: (currentEndDate > new Date() ? userData.subscriptionStartDate : newStartDate.toISOString()),
                    razorpay_payment_id: chargedPayment.entity.id, // Correctly access the nested payment ID
                    subscriptionType: '', // Clear the request type
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
    return NextResponse.json({ error: `Webhook handler failed: ${error.message}` }, { status: 500 });
  }
}
