import type { User, Shop, Product, Sale, Expense, PaymentRequest } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Ankit Sharma',
    email: 'ankit.sharma@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
    role: 'shop_owner',
    shopId: 'shop-1',
  },
  {
    id: 'user-2',
    name: 'Priya Singh',
    email: 'priya.singh@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-2',
    role: 'super_admin',
  },
];

export const MOCK_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    name: "Ankit's General Store",
    industry: 'Retail',
    subscriptionTier: 'premium',
    subscriptionEndDate: new Date(new Date().setDate(new Date().getDate() + 45)).toISOString(),
  },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod-1', shopId: 'shop-1', name: 'Basmati Rice (1kg)', sku: 'BR-1KG', price: 120, stockLevel: 50, imageUrl: 'https://picsum.photos/seed/rice/400/300' },
  { id: 'prod-2', shopId: 'shop-1', name: 'Aashirvaad Atta (5kg)', sku: 'AA-5KG', price: 250, stockLevel: 30, imageUrl: 'https://picsum.photos/seed/flour/400/300' },
  { id: 'prod-3', shopId: 'shop-1', name: 'Tata Salt (1kg)', sku: 'TS-1KG', price: 25, stockLevel: 100, imageUrl: 'https://picsum.photos/seed/salt/400/300' },
  { id: 'prod-4', shopId: 'shop-1', name: 'Amul Butter (500g)', sku: 'AB-500G', price: 260, stockLevel: 20, imageUrl: 'https://picsum.photos/seed/butter/400/300' },
  { id: 'prod-5', shopId: 'shop-1', name: 'Parle-G Biscuits (100g)', sku: 'PG-100G', price: 10, stockLevel: 200, imageUrl: 'https://picsum.photos/seed/biscuits/400/300' },
];

export const MOCK_SALES: Sale[] = [
  { id: 'sale-1', shopId: 'shop-1', productName: 'Basmati Rice (1kg)', quantity: 2, totalPrice: 240, date: '2024-07-20T10:30:00Z', paymentMethod: 'cash' },
  { id: 'sale-2', shopId: 'shop-1', productName: 'Aashirvaad Atta (5kg)', quantity: 1, totalPrice: 250, date: '2024-07-20T11:00:00Z', paymentMethod: 'online' },
  { id: 'sale-3', shopId: 'shop-1', productName: 'Tata Salt (1kg)', quantity: 5, totalPrice: 125, date: '2024-07-19T15:00:00Z', paymentMethod: 'card' },
  { id: 'sale-4', shopId: 'shop-1', productName: 'Parle-G Biscuits (100g)', quantity: 10, totalPrice: 100, date: '2024-07-18T18:00:00Z', paymentMethod: 'cash' },
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp-1', shopId: 'shop-1', description: 'Electricity Bill', amount: 3500, category: 'utilities', date: '2024-07-15T00:00:00Z' },
    { id: 'exp-2', shopId: 'shop-1', description: 'Shop Rent', amount: 15000, category: 'rent', date: '2024-07-05T00:00:00Z' },
    { id: 'exp-3', shopId: 'shop-1', description: 'New Stock Purchase', amount: 8000, category: 'supplies', date: '2024-07-10T00:00:00Z' },
    { id: 'exp-4', shopId: 'shop-1', description: 'Facebook Ads', amount: 2000, category: 'marketing', date: '2024-07-18T00:00:00Z' },
];

export const MOCK_PAYMENT_REQUESTS: PaymentRequest[] = [
    { id: 'pr-1', shopId: 'shop-2', shopName: 'Priya\'s Boutique', amount: 5000, utrNumber: 'UTR1234567890', status: 'pending', dateSubmitted: '2024-07-20T09:00:00Z' },
    { id: 'pr-2', shopId: 'shop-3', shopName: 'Rohan\'s Electronics', amount: 10000, utrNumber: 'UTR0987654321', status: 'pending', dateSubmitted: '2024-07-19T14:30:00Z' },
    { id: 'pr-3', shopId: 'shop-4', shopName: 'Sweets Corner', amount: 5000, utrNumber: 'UTR5647382910', status: 'approved', dateSubmitted: '2024-07-18T11:00:00Z' },
];

export const MOCK_PAYMENT_HISTORY = [
    { date: '2023-08-01', amount: 5000 },
    { date: '2023-11-01', amount: 5000 },
    { date: '2024-02-01', amount: 5000 },
    { date: '2024-05-01', amount: 5000 },
];
