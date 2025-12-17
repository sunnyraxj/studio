'use server';

/**
 * @fileOverview An AI agent to predict subscription expiry.
 *
 * - predictSubscriptionExpiry - A function that predicts subscription expiry.
 * - PredictSubscriptionExpiryInput - The input type for the predictSubscriptionExpiry function.
 * - PredictSubscriptionExpiryOutput - The return type for the predictSubscriptionExpiry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictSubscriptionExpiryInputSchema = z.object({
  shopId: z.string().describe('The ID of the shop.'),
  paymentHistory: z
    .array(z.object({
      date: z.string().describe('The date of the payment.'),
      amount: z.number().describe('The amount of the payment.'),
    }))
    .describe('The payment history of the shop.'),
  industry: z.string().describe('The industry of the shop.'),
  catalogSize: z.number().describe('The number of products in the shop catalog.'),
  macroeconomicConditions: z.string().describe('The current macroeconomic conditions.'),
});
export type PredictSubscriptionExpiryInput = z.infer<typeof PredictSubscriptionExpiryInputSchema>;

const PredictSubscriptionExpiryOutputSchema = z.object({
  probabilityOfRenewal: z
    .number()
    .describe('The probability that the shop will renew its subscription (0-1).'),
  estimatedLeadTimeDays: z
    .number()
    .describe('The estimated lead time in days before the subscription expires.'),
  confidenceInterval: z
    .array(z.number())
    .length(2)
    .describe('A 95% confidence interval for the probability of renewal.'),
  rationale: z.string().describe('The rationale behind the prediction.'),
});
export type PredictSubscriptionExpiryOutput = z.infer<typeof PredictSubscriptionExpiryOutputSchema>;

export async function predictSubscriptionExpiry(input: PredictSubscriptionExpiryInput): Promise<
  PredictSubscriptionExpiryOutput
> {
  return predictSubscriptionExpiryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictSubscriptionExpiryPrompt',
  input: {schema: PredictSubscriptionExpiryInputSchema},
  output: {schema: PredictSubscriptionExpiryOutputSchema},
  prompt: `You are an expert subscription renewal prediction tool. You will analyze the shop's payment history, industry, catalog size, and macroeconomic conditions to predict the probability of subscription renewal.

  Shop ID: {{{shopId}}}
  Payment History:{{#each paymentHistory}} Date: {{{date}}}, Amount: {{{amount}}}{{/each}}
  Industry: {{{industry}}}
  Catalog Size: {{{catalogSize}}}
  Macroeconomic Conditions: {{{macroeconomicConditions}}}

  Based on this information, provide the probability of renewal (0-1), estimated lead time in days before the subscription expires, a 95% confidence interval for the probability of renewal, and the rationale behind the prediction. Make sure the output is valid JSON.`,
});

const predictSubscriptionExpiryFlow = ai.defineFlow(
  {
    name: 'predictSubscriptionExpiryFlow',
    inputSchema: PredictSubscriptionExpiryInputSchema,
    outputSchema: PredictSubscriptionExpiryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
