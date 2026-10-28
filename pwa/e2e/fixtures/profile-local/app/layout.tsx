import { LocaleProvider } from '@/components/common/LocaleProvider';

// Isolated browser fixture: retain real locale/store/page seams without the
// production identity guard, which intentionally redirects an unselected browser.
export default function FixtureLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
