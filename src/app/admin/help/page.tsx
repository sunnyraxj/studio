
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function AdminHelpPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [reply, setReply] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Closed'>('All');

    const ticketsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'supportTickets'), orderBy('lastUpdatedAt', 'desc'));
        if (statusFilter !== 'All') {
            q = query(q, where('status', '==', statusFilter));
        }
        return q;
    }, [firestore, statusFilter]);
    const { data: tickets, isLoading: isTicketsLoading } = useCollection<SupportTicket>(ticketsQuery);

    const messagesQuery = useMemoFirebase(() => {
        if (!selectedTicket || !firestore) return null;
        return query(collection(firestore, 'supportTickets', selectedTicket.id, 'messages'), orderBy('createdAt', 'asc'));
    }, [selectedTicket, firestore]);
    const { data: messages, isLoading: isMessagesLoading } = useCollection<SupportMessage>(messagesQuery);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleTicketSelect = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        if (!ticket.isReadByAdmin && firestore) {
            const ticketRef = doc(firestore, 'supportTickets', ticket.id);
            await updateDoc(ticketRef, { isReadByAdmin: true });
        }
    }

    const handleSendReply = async () => {
        if (!reply.trim() || !selectedTicket || !user || !firestore) return;

        const messagesRef = collection(firestore, 'supportTickets', selectedTicket.id, 'messages');
        const ticketRef = doc(firestore, 'supportTickets', selectedTicket.id);

        try {
            await addDoc(messagesRef, {
                senderId: 'admin',
                senderName: 'Support Team',
                text: reply,
                createdAt: serverTimestamp(),
            });
            await updateDoc(ticketRef, {
                lastMessage: reply,
                lastUpdatedAt: serverTimestamp(),
                status: 'In Progress' // Automatically move to in progress on reply
            });
            setReply('');
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };
    
    const handleStatusChange = async (ticketId: string, status: 'Open' | 'In Progress' | 'Closed') => {
        if (!firestore) return;
        const ticketRef = doc(firestore, 'supportTickets', ticketId);
        try {
            await updateDoc(ticketRef, { status: status });
            toast({ title: 'Status Updated', description: `Ticket marked as ${status}.`});
            // if current selected ticket is updated, update the state
            if(selectedTicket?.id === ticketId) {
                setSelectedTicket(prev => prev ? ({...prev, status}) : null);
            }
        } catch(e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    }

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Help Desk</h2>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-0">
                <Card className="md:col-span-1 h-full flex flex-col">
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                            <CardTitle>All Tickets</CardTitle>
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="flex-grow p-0 overflow-y-auto">
                        <ScrollArea className="h-full">
                            {isTicketsLoading ? (
                                <div className="p-4 space-y-4">
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                            ) : tickets && tickets.length > 0 ? (
                                tickets.map(ticket => (
                                    <div 
                                        key={ticket.id} 
                                        onClick={() => handleTicketSelect(ticket)}
                                        className={cn("p-4 border-b cursor-pointer hover:bg-accent", selectedTicket?.id === ticket.id && "bg-muted")}
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className={cn("font-semibold text-sm", !ticket.isReadByAdmin && "font-extrabold")}>{ticket.subject}</p>
                                            <Badge variant={ticket.status === 'Closed' ? 'secondary' : ticket.status === 'Open' ? 'destructive' : 'default'} className="text-xs">{ticket.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{ticket.ownerName} ({ticket.ownerEmail})</p>
                                        <p className="text-xs text-muted-foreground truncate">{ticket.lastMessage}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(ticket.lastUpdatedAt?.toDate()), { addSuffix: true })}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-10 text-sm text-muted-foreground">
                                    No support tickets found for this filter.
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 h-full flex flex-col">
                    {selectedTicket ? (
                        <>
                        <CardHeader className="border-b flex-row justify-between items-center">
                            <div className="flex items-center gap-2">
                               <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedTicket(null)}><ArrowLeft className="h-4 w-4"/></Button>
                               <div>
                                   <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                                   <CardDescription>From: {selectedTicket.ownerName}</CardDescription>
                               </div>
                           </div>
                           <Select value={selectedTicket.status} onValueChange={(v) => handleStatusChange(selectedTicket.id, v as any)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                           </Select>
                        </CardHeader>
                        <CardContent className="flex-grow p-0 overflow-y-auto">
                            <ScrollArea className="h-full p-4 space-y-4">
                                {isMessagesLoading ? <p>Loading messages...</p>
                                : messages && messages.length > 0 ? messages.map(msg => (
                                    <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === 'admin' ? "justify-end" : "justify-start")}>
                                        <div className={cn("p-3 rounded-lg max-w-sm", msg.senderId === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                            <p className="text-sm font-semibold">{msg.senderName}</p>
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
                                <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." onKeyDown={e => e.key === 'Enter' && handleSendReply()} />
                                <Button onClick={handleSendReply}><Send className="h-4 w-4"/></Button>
                            </div>
                        </CardFooter>
                        </>
                    ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Select a ticket to view the conversation.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

