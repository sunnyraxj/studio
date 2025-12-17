import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search } from 'lucide-react';

export default function POSPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Products</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-8" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="flex flex-col items-center justify-center p-4 hover:bg-accent cursor-pointer">
                  <div className="text-sm font-medium text-center">Product {i + 1}</div>
                  <div className="text-xs text-muted-foreground">₹{(Math.random() * 100).toFixed(2)}</div>
                  <Button variant="ghost" size="icon" className="mt-2 h-8 w-8">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Current Sale</CardTitle>
            <CardDescription>Invoice #INV12345</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input id="customer-name" placeholder="Enter customer name" />
            </div>
            <Separator className="my-4" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Product 3</TableCell>
                  <TableCell className="text-right">₹45.50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Product 7</TableCell>
                  <TableCell className="text-right">₹82.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹127.50</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (5%)</span>
                <span>₹6.38</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>₹133.88</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch space-y-2">
            <Button className="w-full">Complete Sale</Button>
            <Button variant="outline" className="w-full">Hold Sale</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}