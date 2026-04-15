import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LocaleProvider } from '@/components/common/LocaleProvider';

export const metadata: Metadata = {
  title: "What's for Supper",
  description: 'Capture meals, plan your week, discover what to cook next.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "What's for Supper",
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4B5D4D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-cream text-charcoal antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
