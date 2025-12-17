import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Welcome to your Next.js App
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Get started by editing{' '}
          <code className="font-mono bg-gray-100 p-1 rounded">src/app/page.tsx</code>
        </p>
      </div>
    </main>
  );
}
