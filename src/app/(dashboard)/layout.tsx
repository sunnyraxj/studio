import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from "@/components/ui/toaster"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-col md:pl-[var(--sidebar-width)] group-data-[collapsible=icon]:md:pl-[var(--sidebar-width-icon)] transition-[padding] ease-linear">
          <Header />
          <main className="p-4 sm:p-6 lg:p-8 pt-20">
              {children}
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
