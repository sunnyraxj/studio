
'use client';

import React from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { KOT } from '../../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Hash, MessageSquare, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast.tsx';

interface KotListTabProps {
    onBillFromKot: (kot: KOT) => void;
}

export function KotListTab({ onBillFromKot }: KotListTabProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]);
    const { data: userData } = useDoc(userDocRef);
    const shopId = userData?.shopId;

    const kotsQuery = useMemoFirebase(() => {
        if (!shopId || !firestore) return null;
        return query(collection(firestore, `shops/${shopId}/kots`), where('status', '==', 'Active'));
    }, [shopId, firestore]);

    const { data: activeKots, isLoading } = useCollection<KOT>(kotsQuery);
    
    const handleCancelKot = async (kotId: string) => {
        if (!shopId || !firestore) return;
        const kotDocRef = doc(firestore, `shops/${shopId}/kots`, kotId);
        try {
            await updateDoc(kotDocRef, { status: 'Cancelled' });
            toast({ title: 'KOT Cancelled', description: 'The order has been cancelled.' });
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    }

    if(isLoading) {
        return <div className="flex items-center justify-center h-full"><p>Loading Active KOTs...</p></div>
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {!activeKots || activeKots.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground py-20">
                        <p>No active KOTs found.</p>
                    </div>
                ) : (
                    activeKots.map(kot => (
                        <Card key={kot.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Hash className="h-5 w-5"/> Table: {kot.tableNumber || 'N/A'}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 pt-1">
                                            <User className="h-4 w-4"/> {kot.customerName}
                                        </CardDescription>
                                    </div>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancelKot(kot.id)}>
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2">
                                <ul className="text-sm space-y-1">
                                    {kot.items.map((item, index) => (
                                        <li key={index} className="flex justify-between">
                                            <span>{item.name}</span>
                                            <span className="font-semibold">x{item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                                {kot.instructions && (
                                     <div className="text-xs text-muted-foreground pt-2 border-t">
                                        <p className="font-semibold flex items-center gap-1"><MessageSquare className="h-3 w-3"/>Instructions:</p>
                                        <p className="pl-1">{kot.instructions}</p>
                                     </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => onBillFromKot(kot)}>
                                    Bill Order
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </ScrollArea>
    )
}
