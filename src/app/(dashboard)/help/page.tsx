'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Send, ArrowLeft, Loader2, Lightbulb } from 'lucide-react';
import { format, formatDistanceToNow, isAfter, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast.tsx';

type SupportTicket = {
    id: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    subject: string;
    status: 'Open' | 'In Progress' | 'Closed';
    createdAt: any;
    lastUpdatedAt: any;
    lastMessage: string;
    isReadByAdmin: boolean;
};

type SupportMessage = {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any;
}

const SuggestionDialog = ({ isOpen, onOpenChange, onSuggestionCreated }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSuggestionCreated: () => void }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateSuggestion = async () => {
        if (!user || !firestore) return;
        if (!title.trim() || !description.trim()) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide a title and a description for your suggestion.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const now = serverTimestamp();
            
            const newSuggestion: Omit<SupportTicket, 'id'> = {
                ownerId: user.uid,
                ownerName: user.displayName || 'Unknown User',
                ownerEmail: user.email || 'no-email',
                subject: title,
                status: 'Open',
                createdAt: now,
                lastUpdatedAt: now,
                lastMessage: description,
                isReadByAdmin: false,
            };
            
            const ticketsCollectionRef = collection(firestore, 'supportTickets');
            const newTicketRef = await addDoc(ticketsCollectionRef, newSuggestion);

            const newMessage: Omit<SupportMessage, 'id'> = {
                senderId: user.uid,
                senderName: user.displayName || 'User',
                text: description,
                createdAt: now,
            };

            const messagesCollectionRef = collection(newTicketRef, 'messages');
            await addDoc(messagesCollectionRef, newMessage);
            
            toast({ title: 'Suggestion Submitted', description: 'Thank you for your feedback! Our team will review it.'});
            setTitle('');
            setDescription('');
            onSuggestionCreated();
            onOpenChange(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
         <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Suggest a New Feature</DialogTitle>
                    <DialogDescription>Have an idea to improve the app? Let us know!</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Feature Title</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Add analytics for customer demographics" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Please describe your feature idea in detail..." rows={5} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreateSuggestion} disabled={isSubmitting}>Submit Suggestion</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function HelpAndSupportPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [selectedSuggestion, setSelectedSuggestion] = useState<SupportTicket | null>(null);
    const [isNewSuggestionDialogOpen, setIsNewSuggestionDialogOpen] = useState(false);
    const [reply, setReply] = useState('');

    const ticketsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'supportTickets'), where('ownerId', '==', user.uid), orderBy('lastUpdatedAt', 'desc'));
    }, [user, firestore]);
    const { data: suggestions, isLoading: isSuggestionsLoading } = useCollection<SupportTicket>(ticketsQuery);

    const messagesQuery = useMemoFirebase(() => {
        if (!selectedSuggestion || !firestore) return null;
        return query(collection(firestore, 'supportTickets', selectedSuggestion.id, 'messages'), orderBy('createdAt', 'asc'));
    }, [selectedSuggestion, firestore]);
    const { data: messages, isLoading: isMessagesLoading } = useCollection<SupportMessage>(messagesQuery);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedSuggestion || !user || !firestore) return;

        toast({ variant: 'destructive', title: 'Feature Disabled', description: 'Replying to suggestions is not enabled.' });
    };
    
    const handleSuggestionCreated = () => {
        // The useCollection hook will automatically refresh the list.
    };

    if (isUserLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Suggestions &amp; Feature Requests</h2>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-0">
                <Card className="md:col-span-1 h-full flex flex-col">
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                            <CardTitle>My Suggestions</CardTitle>
                            <CardDescription>Your submitted ideas</CardDescription>
                        </div>
                         <Button size="sm" onClick={() => setIsNewSuggestionDialogOpen(true)}><Lightbulb className="mr-2 h-4 w-4"/>New Suggestion</Button>
                    </CardHeader>
                    <CardContent className="flex-grow p-0 overflow-y-auto">
                        <ScrollArea className="h-full">
                            {isSuggestionsLoading ? (
                                <div className="p-4 space-y-4">
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                            ) : suggestions && suggestions.length > 0 ? (
                                suggestions.map(ticket => (
                                    <div 
                                        key={ticket.id} 
                                        onClick={() => setSelectedSuggestion(ticket)}
                                        className={cn("p-4 border-b cursor-pointer hover:bg-accent", selectedSuggestion?.id === ticket.id && "bg-muted")}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-sm">{ticket.subject}</p>
                                            <Badge variant={ticket.status === 'Closed' ? 'secondary' : 'default'} className="text-xs">{ticket.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{ticket.lastMessage}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(ticket.lastUpdatedAt?.toDate()), { addSuffix: true })}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-10 text-sm text-muted-foreground">
                                    You have no suggestions.
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 h-full flex flex-col">
                    {selectedSuggestion ? (
                        <>
                        <CardHeader className="border-b">
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedSuggestion(null)}><ArrowLeft className="h-4 w-4"/></Button>
                                <div>
                                    <CardTitle className="text-lg">{selectedSuggestion.subject}</CardTitle>
                                    <CardDescription>Created on {format(new Date(selectedSuggestion.createdAt?.toDate()), 'dd MMM yyyy')}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-0 overflow-y-auto">
                            <ScrollArea className="h-full p-4 space-y-4">
                                {isMessagesLoading ? <p>Loading messages...</p>
                                : messages && messages.length > 0 ? messages.map(msg => (
                                    <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === user?.uid ? "justify-end" : "justify-start")}>
                                        <div className={cn("p-3 rounded-lg max-w-sm", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.createdAt?.toDate()), 'hh:mm a')}</p>
                                        </div>
                                    </div>
                                )) : <p>No messages yet.</p>
                                }
                                <div ref={messagesEndRef} />
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="pt-4 border-t">
                            <div className="flex w-full items-center gap-2">
                                <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Replying is disabled" disabled />
                                <Button onClick={handleSendReply} disabled><Send className="h-4 w-4"/></Button>
                            </div>
                        </CardFooter>
                        </>
                    ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Select a suggestion to view the conversation.</p>
                        </div>
                    )}
                </Card>
            </div>
             <SuggestionDialog isOpen={isNewSuggestionDialogOpen} onOpenChange={setIsNewSuggestionDialogOpen} onSuggestionCreated={handleSuggestionCreated} />
        </div>
    );
}
