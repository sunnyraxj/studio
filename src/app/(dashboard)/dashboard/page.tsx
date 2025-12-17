import { getAuthenticatedUser } from "@/lib/auth";
import { getShopOwnerDashboardData, getSuperAdminDashboardData } from "@/lib/api";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { DollarSign, Wallet, IndianRupee, Users, FileCheck2 } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

async function ShopOwnerDashboard() {
  const data = await getShopOwnerDashboardData();

  if (!data) {
    return <div>Could not load dashboard data.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard 
          title="Total Revenue" 
          value={`₹${data.totalRevenue.toLocaleString()}`}
          icon={IndianRupee}
          description="+20.1% from last month"
        />
        <StatsCard 
          title="Total Expenses" 
          value={`₹${data.totalExpenses.toLocaleString()}`}
          icon={Wallet}
          description="+180.1% from last month"
        />
        <StatsCard 
          title="Net Profit" 
          value={`₹${data.netProfit.toLocaleString()}`}
          icon={DollarSign}
          description="+19% from last month"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4">
          <SalesChart />
        </div>
        <div className="lg:col-span-3">
          <RecentSales sales={data.sales} />
        </div>
      </div>
    </div>
  );
}

async function SuperAdminDashboard() {
  const data = await getSuperAdminDashboardData();
    if (!data) {
    return <div>Could not load dashboard data.</div>;
  }
  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard 
          title="Pending Approvals" 
          value={data.pendingApprovals}
          icon={FileCheck2}
          description="Manual payment requests"
        />
        <StatsCard 
          title="Total Shops" 
          value={data.totalShops}
          icon={Users}
          description="Currently active on the platform"
        />
      </div>
      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
            <Button asChild>
                <Link href="/approvals">Review Payment Approvals</Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/shops">Manage Shops</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      {user?.role === 'super_admin' ? <SuperAdminDashboard /> : <ShopOwnerDashboard />}
    </>
  )
}
