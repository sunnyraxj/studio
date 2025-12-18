
import { Building, User, Shield } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const roles = [
  {
    name: 'Shop Owner / Staff',
    description: 'Manage your shop, products, and sales.',
    icon: Building,
    href: '/dashboard',
  },
  {
    name: 'Super Admin',
    description: 'Oversee the entire platform.',
    icon: Shield,
    href: '/admin',
  },
];

export default function RoleSelectionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Choose Your Role
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select how you want to enter the application.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full px-6">
        {roles.map((role) => (
          <Link href={role.href} key={role.name}>
            <Card className="hover:bg-accent hover:border-primary transition-all duration-200 cursor-pointer h-full flex flex-col">
              <CardHeader className="items-center text-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                  <role.icon className="h-8 w-8" />
                </div>
                <CardTitle>{role.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow">
                <CardDescription>{role.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
