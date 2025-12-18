
import React from 'react';
import { FirebaseClientProvider } from '@/firebase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <div className="min-h-screen bg-muted/40">
        {children}
      </div>
    </FirebaseClientProvider>
  );
}
