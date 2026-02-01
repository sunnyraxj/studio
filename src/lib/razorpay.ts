
import Razorpay from 'razorpay';

/**
 * Creates and returns a new instance of the Razorpay client.
 * This function is designed to be called within an API route handler
 * to ensure environment variables are loaded correctly in a serverless environment.
 * 
 * @throws {Error} If Razorpay API keys are not set in the environment variables.
 * @returns {Razorpay} A new Razorpay instance.
 */
export function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error(
      'RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET are not set in environment variables. Razorpay functionality is disabled.'
    );
    // Throw an error to ensure the calling function knows about the misconfiguration.
    throw new Error('Razorpay is not configured. Please set API keys in environment variables.');
  }

  // Create and return a new instance every time.
  // This is safe and ensures env vars are read on each serverless function invocation.
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}
