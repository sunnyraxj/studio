import { getSales } from "@/lib/api";
import { SalesTable } from "@/components/sales/sales-table";

export default async function SalesPage() {
  const sales = await getSales();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">
          View and manage all your sales transactions.
        </p>
      </div>
      <SalesTable data={sales} />
    </div>
  );
}
