import { getExpenses } from "@/lib/api";
import { ExpensesTable } from "@/components/expenses/expenses-table";

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">
          Keep track of all your business expenses.
        </p>
      </div>
      <ExpensesTable data={expenses} />
    </div>
  );
}
