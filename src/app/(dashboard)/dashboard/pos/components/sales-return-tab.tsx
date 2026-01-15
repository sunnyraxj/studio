'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export function SalesReturnTab() {
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const handleSearch = () => {
    // Logic to search for the invoice will be implemented here
    console.log(`Searching for invoice: ${invoiceNumber}`);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Process a Sales Return</CardTitle>
        <CardDescription>
          Enter an invoice number to find the sale and process a return or exchange.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full max-w-sm items-center space-x-2 mx-auto mt-8">
          <Input
            type="text"
            placeholder="Enter Invoice #"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
          <Button type="submit" onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
        </div>
        {/* Results will be displayed here */}
      </CardContent>
    </Card>
  );
}
