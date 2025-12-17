"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const paymentFormSchema = z.object({
  utr: z.string().min(12, "UTR must be at least 12 characters").max(22, "UTR must be at most 22 characters"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
});

export function ManualPaymentForm() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof paymentFormSchema>>({
        resolver: zodResolver(paymentFormSchema),
        defaultValues: {
            utr: "",
            amount: 5000,
        }
    });

    function onSubmit(values: z.infer<typeof paymentFormSchema>) {
        console.log(values);
        toast({
            title: "Payment Submitted",
            description: `Your payment with UTR ${values.utr} has been submitted for verification.`,
        });
        form.reset();
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renew Subscription</CardTitle>
        <CardDescription>
          Submit your manual payment details for verification.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="utr"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>UTR / Transaction ID</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter your payment UTR" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full">Submit for Verification</Button>
            </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
