import { VscBeaker, VscRocket } from 'react-icons/vsc';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const modes = [
  {
    name: 'Demo',
    description: 'Explore the app with sample data. No changes will be saved.',
    icon: VscBeaker,
    href: '/owner/dashboard',
  },
  {
    name: 'Production',
    description: 'Manage your live shop with real data.',
    icon: VscRocket,
    href: '/production/dashboard',
  },
];

export default function ModeSelectionPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Select Environment
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the environment you want to work in.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl w-full px-6">
        {modes.map((mode) => (
          <Link href={mode.href} key={mode.name}>
            <Card className="hover:bg-accent hover:border-primary transition-all duration-200 cursor-pointer h-full flex flex-col">
              <CardHeader className="items-center text-center">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                  <mode.icon className="h-8 w-8" />
                </div>
                <CardTitle>{mode.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow">
                <CardDescription>{mode.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
