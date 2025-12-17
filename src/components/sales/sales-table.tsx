"use client";

import { DataTable } from "@/components/data-table";
import { columns } from "./sales-table-columns";
import type { Sale } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface SalesTableProps {
    data: Sale[];
}

export function SalesTable({ data }: SalesTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={data}
            filterColumn="productName"
            filterPlaceholder="Filter by product..."
            addAction={
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Sale
                </Button>
            }
        />
    )
}
