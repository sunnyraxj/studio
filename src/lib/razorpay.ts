
import Razorpay from 'razorpay';

let razorpayInstance: Razorpay | null = null;

// Only initialize if keys are present. This prevents a crash during build time
// when environment variables might not be available.
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn(
    'RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET are not set. Razorpay functionality will be disabled.'
  );
}

export { razorpayInstance };
