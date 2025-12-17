"use client";

import { DataTable } from "@/components/data-table";
import { columns } from "./approvals-table-columns";
import type { PaymentRequest } from "@/lib/types";

interface ApprovalsTableProps {
    data: PaymentRequest[];
}

export function ApprovalsTable({ data }: ApprovalsTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={data}
            filterColumn="shopName"
            filterPlaceholder="Filter by shop name..."
        />
    )
}
