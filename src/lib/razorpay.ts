
import Razorpay from 'razorpay';

let razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay | null {
  if (razorpayInstance) {
    return razorpayInstance;
  }
  
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } else {
    console.warn(
      'RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET are not set. Razorpay functionality will be disabled.'
    );
  }
  return razorpayInstance;
}
