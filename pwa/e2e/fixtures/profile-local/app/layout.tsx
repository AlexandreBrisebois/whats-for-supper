import '@/app/globals.css';
import { ContrastProvider } from '@/components/common/ContrastProvider';
import { LocaleProvider } from '@/components/common/LocaleProvider';
import { CONTRAST_BOOT_SCRIPT } from '@/lib/contrast';

// Isolated browser fixture: retain real locale/contrast/store/page seams without the
// production identity guard, which intentionally redirects an unselected browser.
export default function FixtureLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script id="contrast-init" dangerouslySetInnerHTML={{ __html: CONTRAST_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-cream text-ink-body antialiased">
        <ContrastProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ContrastProvider>
      </body>
    </html>
  );
}
