import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import type { Sale } from "@/lib/types";

type RecentSalesProps = {
  sales: Sale[];
};

export function RecentSales({ sales }: RecentSalesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>You made {sales.length} sales this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {sales.slice(0, 5).map((sale, index) => (
            <div key={sale.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarImage src={`https://i.pravatar.cc/150?u=sale-${index}`} alt="Avatar" />
                <AvatarFallback>{sale.productName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{sale.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(sale.date).toLocaleDateString()}
                </p>
              </div>
              <div className="ml-auto font-medium">+₹{sale.totalPrice.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
