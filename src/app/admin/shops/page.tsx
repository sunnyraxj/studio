
'use client';

import { useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Shop = {
  id: string;
  name: string;
  ownerId: string;
};

type ShopViewModel = Shop & {
  ownerEmail?: string;
};

type UserProfile = {
  email?: string;
}

export default function AdminShopsPage() {
  const firestore = useFirestore();

  const shopsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'shops');
  }, [firestore]);

  const { data: shopsData, isLoading: isShopsLoading } = useCollection<Shop>(shopsCollectionRef);
  const [shops, setShops] = useState<ShopViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isShopsLoading || !shopsData || !firestore) {
        if (!isShopsLoading) {
            setIsLoading(false);
        }
        return;
    };

    const fetchShopOwners = async () => {
        setIsLoading(true);
        const shopsWithOwners = await Promise.all(
            shopsData.map(async (shop) => {
                let ownerEmail = 'N/A';
                try {
                    if (shop.ownerId) {
                        const userDocRef = doc(firestore, 'users', shop.ownerId);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                           const userData = userDocSnap.data() as UserProfile;
                           ownerEmail = userData.email || 'N/A';
                        }
                    }
                } catch (error) {
                    console.error(`Failed to fetch owner for shop ${shop.id}`, error);
                }
                return { ...shop, ownerEmail };
            })
        );
        setShops(shopsWithOwners);
        setIsLoading(false);
    };

    fetchShopOwners();

  }, [shopsData, isShopsLoading, firestore]);

  return (
    <div className="flex-1 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registered Shops</CardTitle>
          <CardDescription>
            A list of all shops that have subscribed to the service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Owner's Email</TableHead>
                <TableHead>Shop ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">Loading shops...</TableCell>
                </TableRow>
              ) : shops && shops.length > 0 ? (
                shops.map(shop => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>{shop.ownerEmail}</TableCell>
                    <TableCell className="text-muted-foreground">{shop.id}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">No shops found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
