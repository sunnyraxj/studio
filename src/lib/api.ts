import { getAuthenticatedUser } from './auth';
import { MOCK_PRODUCTS, MOCK_SALES, MOCK_EXPENSES, MOCK_PAYMENT_REQUESTS, MOCK_SHOPS, MOCK_PAYMENT_HISTORY } from './data';
import type { Product, Sale, Expense, PaymentRequest, Shop } from './types';

// Simulate API latency
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getShopData() {
  await delay(200);
  const user = await getAuthenticatedUser();
  if (user?.role === 'shop_owner' && user.shopId) {
    const shop = MOCK_SHOPS.find(s => s.id === user.shopId);
    return shop || null;
  }
  return null;
}

export async function getProducts(): Promise<Product[]> {
  await delay(300);
  const user = await getAuthenticatedUser();
  if (user?.role === 'shop_owner' && user.shopId) {
    return MOCK_PRODUCTS.filter(p => p.shopId === user.shopId);
  }
  return [];
}

export async function getSales(): Promise<Sale[]> {
  await delay(400);
  const user = await getAuthenticatedUser();
  if (user?.role === 'shop_owner' && user.shopId) {
    return MOCK_SALES.filter(s => s.shopId === user.shopId);
  }
  return [];
}

export async function getExpenses(): Promise<Expense[]> {
  await delay(500);
  const user = await getAuthenticatedUser();
  if (user?.role === 'shop_owner' && user.shopId) {
    return MOCK_EXPENSES.filter(e => e.shopId === user.shopId);
  }
  return [];
}


export async function getPaymentRequests(): Promise<PaymentRequest[]> {
  await delay(300);
  const user = await getAuthenticatedUser();
  if (user?.role === 'super_admin') {
    return MOCK_PAYMENT_REQUESTS;
  }
  return [];
}

export async function getShopOwnerDashboardData() {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'shop_owner' || !user.shopId) return null;

    const sales = await getSales();
    const expenses = await getExpenses();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        sales,
        expenses,
    };
}

export async function getSuperAdminDashboardData() {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'super_admin') return null;

    const paymentRequests = await getPaymentRequests();
    const pendingRequests = paymentRequests.filter(pr => pr.status === 'pending');
    
    return {
        pendingApprovals: pendingRequests.length,
        totalShops: MOCK_SHOPS.length,
    }
}

export async function getSubscriptionPredictionData() {
    const user = await getAuthenticatedUser();
    if (user?.role !== 'shop_owner' || !user.shopId) return null;

    const shop = MOCK_SHOPS.find(s => s.id === user.shopId);
    if (!shop) return null;
    
    const products = MOCK_PRODUCTS.filter(p => p.shopId === user.shopId);

    return {
        shopId: shop.id,
        paymentHistory: MOCK_PAYMENT_HISTORY,
        industry: shop.industry,
        catalogSize: products.length,
        macroeconomicConditions: 'Stable with moderate inflation',
    };
}
