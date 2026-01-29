
import { NextRequest, NextResponse } from 'next/server';
import { razorpayInstance } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const subscription = await razorpayInstance.subscriptions.create({
      plan_id: planId,
      total_count: 12, // For a yearly plan, this will charge 12 times. Adjust as needed.
      quantity: 1,
    });

    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (error: any) {
    console.error('Error creating Razorpay subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
