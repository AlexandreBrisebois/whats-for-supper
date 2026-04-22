import { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '@/components/common/LocaleProvider';
import { IdentityValidator } from '@/components/identity/IdentityValidator';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "What's for Supper",
  description: 'Capture recipes, plan your week, discover what to cook next.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "What's for Supper",
  },
  icons: {
    icon: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#CD5D45',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}</Script>
      </head>
      <body className="min-h-dvh bg-cream text-charcoal antialiased">
        <LocaleProvider>
          <IdentityValidator>{children}</IdentityValidator>
        </LocaleProvider>
      </body>
    </html>
  );
}
