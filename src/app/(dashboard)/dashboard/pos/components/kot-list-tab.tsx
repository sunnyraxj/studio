'use client';

import React, { useState, useRef } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { KOT } from '../../page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Hash, MessageSquare, XCircle, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast.tsx';
import { KOT as KOTPrintable } from './kot';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


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
    
    const [kotToReprint, setKotToReprint] = useState<KOT | null>(null);
    const printRef = useRef(null);

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
    
    const handleReprint = () => {
        const printContent = printRef.current;
        if (printContent) {
            const newWindow = window.open('', '_blank', 'width=300,height=600');
            if (newWindow) {
                const printableContent = (printContent as HTMLDivElement).innerHTML;
                
                newWindow.document.write('<html><head><title>Reprint KOT</title>');
                const styles = Array.from(document.styleSheets)
                  .map(styleSheet => {
                      try {
                          return Array.from(styleSheet.cssRules)
                              .map(rule => rule.cssText)
                              .join('');
                      } catch (e) {
                          console.log('Access to stylesheet %s is denied. Skipping.', styleSheet.href);
                          return '';
                      }
                  })
                  .join('');
                
                newWindow.document.write(`<style>${styles}</style>`);
                newWindow.document.write('</head><body>');
                newWindow.document.write(printableContent);
                newWindow.document.write('</body></html>');
                newWindow.document.close();
                newWindow.focus();
                setTimeout(() => {
                    newWindow.print();
                    newWindow.close();
                }, 250);
            }
        }
    };


    if(isLoading) {
        return <div className="flex items-center justify-center h-full"><p>Loading Active KOTs...</p></div>
    }

    return (
        <>
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
                                    <div className="flex items-center">
                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setKotToReprint(kot)}>
                                        <Printer className="h-4 w-4" />
                                     </Button>
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancelKot(kot.id)}>
                                        <XCircle className="h-5 w-5" />
                                     </Button>
                                    </div>
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
        <Dialog open={!!kotToReprint} onOpenChange={(open) => !open && setKotToReprint(null)}>
            <DialogContent className="max-w-sm p-0 border-0">
                <DialogHeader className="p-4">
                    <DialogTitle>Reprint KOT</DialogTitle>
                    <DialogDescription>
                        A preview of the KOT for Table {kotToReprint?.tableNumber}.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-4 flex justify-center">
                    <div ref={printRef}>
                       {kotToReprint && (
                           <KOTPrintable
                                cart={kotToReprint.items.map(item => ({ product: { name: item.name }, quantity: item.quantity }))}
                                invoiceNumber={kotToReprint.id.slice(-6).toUpperCase()} // Using part of KOT ID as a ref
                                customerName={kotToReprint.customerName}
                                instructions={kotToReprint.instructions}
                                tableNumber={kotToReprint.tableNumber}
                           />
                       )}
                    </div>
                </div>
                <DialogFooter className="p-4 border-t">
                    <Button variant="outline" onClick={() => setKotToReprint(null)}>Close</Button>
                    <Button onClick={handleReprint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
