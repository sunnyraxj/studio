"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { predictSubscriptionExpiry, PredictSubscriptionExpiryOutput, PredictSubscriptionExpiryInput } from '@/ai/flows/subscription-expiry-prediction';
import { Wand2, Zap, Info } from 'lucide-react';

interface SubscriptionPredictionProps {
    predictionData: PredictSubscriptionExpiryInput
}

export function SubscriptionPrediction({ predictionData }: SubscriptionPredictionProps) {
    const [prediction, setPrediction] = useState<PredictSubscriptionExpiryOutput | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePredict = async () => {
        setLoading(true);
        setError(null);
        setPrediction(null);
        try {
            const result = await predictSubscriptionExpiry(predictionData);
            setPrediction(result);
        } catch (e) {
            setError("Failed to get prediction. Please try again.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const probabilityPercent = prediction ? Math.round(prediction.probabilityOfRenewal * 100) : 0;
    const probabilityColor = probabilityPercent > 70 ? 'bg-green-500' : probabilityPercent > 40 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Wand2 className="h-6 w-6 text-primary" />
                    AI Renewal Prediction
                </CardTitle>
                <CardDescription>
                    Analyze your shop's data to predict the likelihood of subscription renewal.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && <div className="text-destructive text-sm">{error}</div>}
                
                {prediction && (
                    <div className='space-y-6'>
                        <div>
                            <div className='flex justify-between items-center mb-1'>
                                <span className='text-sm font-medium'>Renewal Probability</span>
                                <span className='font-bold text-lg'>{probabilityPercent}%</span>
                            </div>
                            <Progress value={probabilityPercent} indicatorClassName={probabilityColor} />
                            <p className='text-xs text-muted-foreground mt-1'>Confidence: {prediction.confidenceInterval[0]*100}% - {prediction.confidenceInterval[1]*100}%</p>
                        </div>

                        <div className='flex justify-between items-center bg-muted/50 p-3 rounded-lg'>
                            <span className='text-sm font-medium'>Estimated Expiry Lead Time</span>
                            <span className='font-bold text-lg'>{prediction.estimatedLeadTimeDays} days</span>
                        </div>

                        <div>
                            <h4 className='font-semibold mb-2 flex items-center gap-2'><Info className='h-4 w-4' /> Rationale</h4>
                            <p className='text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border'>
                                {prediction.rationale}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handlePredict} disabled={loading} className='w-full'>
                    <Zap className="mr-2 h-4 w-4" />
                    {loading ? 'Analyzing...' : prediction ? 'Re-analyze' : 'Analyze Renewal Probability'}
                </Button>
            </CardFooter>
        </Card>
    );
}
