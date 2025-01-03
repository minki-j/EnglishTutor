import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Navigation } from '@/components/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EnglishTutor',
  description: 'Improve your English writing skills with AI-powered corrections and quizzes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense
              fallback={
                <div className="min-h-screen bg-background animate-pulse">
                  <div className="h-16 bg-muted" />
                  <main className="container mx-auto px-4 py-8 space-y-4">
                    <div className="h-8 w-[200px] bg-muted rounded" />
                    <div className="h-32 bg-muted rounded" />
                    <div className="grid gap-4">
                      <div className="h-20 bg-muted rounded" />
                      <div className="h-20 bg-muted rounded" />
                    </div>
                  </main>
                </div>
              }
            >
              <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                  {children}
                </main>
              </div>
            </Suspense>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}