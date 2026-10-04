import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import { resolveAppIdentity } from '@/lib/server/app-identity';
import Script from 'next/script';
import { Suspense } from 'react';
import { PdfShareLifecycle } from '@/components/capture/PdfShareLifecycle';
import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '@/components/common/LocaleProvider';
import { InstallIdentityProvider } from '@/components/identity/IdentityHint';
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

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const identity = resolveAppIdentity();
  return {
    title: identity.name,
    description: 'Capture recipes, plan your week, discover what to cook next.',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: identity.name,
    },
    icons: {
      icon: identity.icons.favicon,
      apple: identity.icons.apple,
      ...(identity.icons.shortcut ? { shortcut: identity.icons.shortcut } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#CD5D45',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const identity = resolveAppIdentity();
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <head>
        {/* iOS Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-750x1334.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1125x2436.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-828x1792.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1242x2688.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1080x2340.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1170x2532.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1284x2778.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1179x2556.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/splash/splash-1290x2796.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-1536x2048.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-1668x2388.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          href="/splash/splash-2048x2732.png"
        />
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
          }
        `}</Script>
      </head>
      <body className="min-h-dvh bg-cream text-charcoal antialiased">
        <Script src="/pdf-share.js" strategy="beforeInteractive" />
        <Suspense fallback={null}>
          <PdfShareLifecycle />
        </Suspense>
        <LocaleProvider>
          <InstallIdentityProvider identity={{ demo: identity.demo, channel: identity.channel }}>
            <IdentityValidator>{children}</IdentityValidator>
          </InstallIdentityProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
