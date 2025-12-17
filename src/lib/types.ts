export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'shop_owner' | 'super_admin';
  shopId?: string;
};

export type Shop = {
  id: string;
  name: string;
  industry: string;
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
  subscriptionEndDate: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockLevel: number;
  shopId: string;
  imageUrl?: string;
};

export type Sale = {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  date: string;
  paymentMethod: 'cash' | 'card' | 'online';
  shopId: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  category: 'marketing' | 'utilities' | 'rent' | 'supplies' | 'other';
  date: string;
  shopId: string;
};

export type PaymentRequest = {
  id: string;
  shopId: string;
  shopName: string;
  amount: number;
  utrNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  dateSubmitted: string;
};
