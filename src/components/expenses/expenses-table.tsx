"use client";

import { DataTable } from "@/components/data-table";
import { columns } from "./expenses-table-columns";
import type { Expense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface ExpensesTableProps {
    data: Expense[];
}

export function ExpensesTable({ data }: ExpensesTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={data}
            filterColumn="description"
            filterPlaceholder="Filter by description..."
            addAction={
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                </Button>
            }
        />
    )
}
