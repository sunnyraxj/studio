"use client";

import { DataTable } from "@/components/data-table";
import { columns } from "./product-table-columns";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface ProductTableProps {
    data: Product[];
}

export function ProductTable({ data }: ProductTableProps) {
    return (
        <DataTable 
            columns={columns} 
            data={data}
            filterColumn="name"
            filterPlaceholder="Filter products..."
            addAction={
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Product
                </Button>
            }
        />
    )
}
