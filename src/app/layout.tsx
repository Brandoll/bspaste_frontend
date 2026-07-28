import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import QueryProvider from '@/providers/QueryProvider';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { AuthProvider } from '@/providers/AuthProvider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BSPaste - Secure, End-to-End Encrypted Pastebin',
  description: 'Share code and text securely with end-to-end encryption.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <ServiceWorkerRegistration />
              <Toaster position="bottom-right" richColors />
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
