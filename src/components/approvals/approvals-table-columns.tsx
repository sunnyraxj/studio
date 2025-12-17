"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { PaymentRequest } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "../ui/badge"
import { useToast } from "@/hooks/use-toast"

function ActionsCell({ row }: { row: any }) {
    const { toast } = useToast();
    const request = row.original as PaymentRequest;

    const handleApprove = () => {
        toast({
            title: "Payment Approved",
            description: `Payment from ${request.shopName} for ₹${request.amount.toLocaleString()} has been approved.`,
        });
    };

    const handleReject = () => {
        toast({
            variant: "destructive",
            title: "Payment Rejected",
            description: `Payment from ${request.shopName} has been rejected.`,
        });
    };

    if (request.status !== 'pending') {
        return <span className="text-muted-foreground capitalize">{request.status}</span>
    }

    return (
        <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleApprove}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
            </Button>
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleReject}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
            </Button>
        </div>
    )
}

export const columns: ColumnDef<PaymentRequest>[] = [
  {
    accessorKey: "shopName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Shop Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "dateSubmitted",
    header: "Submitted",
    cell: ({ row }) => {
        const date = new Date(row.getValue("dateSubmitted"))
        return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    accessorKey: "utrNumber",
    header: "UTR Number",
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        if (status === 'approved') variant = 'default';
        if (status === 'rejected') variant = 'destructive';

        return <Badge variant={variant} className="capitalize">{status}</Badge>
    }
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ActionsCell,
  },
]
