import { getShopData, getSubscriptionPredictionData } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionPrediction } from "@/components/subscription/subscription-prediction";
import { ManualPaymentForm } from "@/components/subscription/manual-payment-form";
import { Badge } from "@/components/ui/badge";

export default async function SubscriptionPage() {
    const shop = await getShopData();
    const predictionData = await getSubscriptionPredictionData();

    if (!shop || !predictionData) {
        return <div>Could not load subscription data.</div>
    }

    const endDate = new Date(shop.subscriptionEndDate);
    const daysRemaining = Math.round((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
                <p className="text-muted-foreground">
                Manage your subscription and payments.
                </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Plan</CardTitle>
                            <CardDescription>Your current subscription details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Plan</span>
                                <Badge className="capitalize text-base">{shop.subscriptionTier}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Expires On</span>
                                <span className="font-semibold">{endDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Days Remaining</span>
                                <span className="font-semibold text-primary">{daysRemaining} days</span>
                            </div>
                        </CardContent>
                    </Card>
                    <SubscriptionPrediction predictionData={predictionData} />
                </div>
                <div>
                    <ManualPaymentForm />
                </div>
            </div>
        </div>
    );
}
