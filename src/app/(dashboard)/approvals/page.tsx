import { getPaymentRequests } from "@/lib/api";
import { ApprovalsTable } from "@/components/approvals/approvals-table";

export default async function ApprovalsPage() {
  const paymentRequests = await getPaymentRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve or reject manual payment submissions.
        </p>
      </div>
      <ApprovalsTable data={paymentRequests} />
    </div>
  );
}
